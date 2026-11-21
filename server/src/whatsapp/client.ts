import WebSocket from 'ws';

// Ensure global WebSocket is available for Baileys
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

import makeWASocket, {
  DisconnectReason,
  WASocket,
  makeCacheableSignalKeyStore,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { getSupabaseClient } from '../db/supabase.js';
import { useSupabaseAuthState } from '../db/auth-store.js';
import { isValidDirectChatJid, extractPhoneNumber } from './status-engine.js';

export interface WhatsAppEvents {
  onQrCode: (qr: string) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected', user?: string) => void;
  onMessageReceived: (data: {
    jid: string;
    senderNumber: string;
    text: string;
    fromMe: boolean;
    timestamp: string;
    pushName?: string;
  }) => void;
}

let socketInstance: WASocket | null = null;
let currentQr: string | null = null;
let currentStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
let currentUserPhone: string | null = null;
let isReconnecting = false;
let lastError: any = null;
let registeredEvents: WhatsAppEvents | null = null;

export function getWhatsAppState() {
  return {
    status: currentStatus,
    qrCode: currentQr,
    userPhone: currentUserPhone,
    lastError,
  };
}

export async function restartWhatsApp(): Promise<void> {
  if (socketInstance) {
    try {
      socketInstance.end(undefined);
    } catch {}
  }
  socketInstance = null;
  currentQr = null;
  currentStatus = 'connecting';
  if (registeredEvents) {
    await initWhatsApp(registeredEvents);
  }
}

export async function logoutWhatsApp(): Promise<void> {
  if (socketInstance) {
    try {
      await socketInstance.logout();
    } catch {}
    try {
      socketInstance.end(undefined);
    } catch {}
  }
  socketInstance = null;
  currentQr = null;
  currentUserPhone = null;
  currentStatus = 'connecting';

  // Wipe auth store in Supabase so a clean new QR code is generated
  try {
    const supabase = getSupabaseClient();
    await supabase.from('baileys_auth_store').delete().neq('id', '');
  } catch (err) {
    console.error('Failed to clear baileys_auth_store on logout:', err);
  }

  if (registeredEvents) {
    await initWhatsApp(registeredEvents);
  }
}

export async function sendWhatsAppMessage(jid: string, text: string): Promise<any> {
  if (!socketInstance || currentStatus !== 'connected') {
    throw new Error('WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu.');
  }

  let targetJid = jid;
  if (!targetJid.includes('@')) {
    targetJid = `${targetJid.replace(/\D/g, '')}@s.whatsapp.net`;
  }

  const result = await socketInstance.sendMessage(targetJid, { text });

  const supabase = getSupabaseClient();
  const timestamp = new Date().toISOString();
  await supabase
    .from('contacts')
    .update({
      last_message_text: text,
      last_message_at: timestamp,
      last_sender_is_me: true,
      updated_at: timestamp,
    })
    .eq('jid', targetJid);

  if (registeredEvents) {
    registeredEvents.onMessageReceived({
      jid: targetJid,
      senderNumber: extractPhoneNumber(targetJid),
      text,
      fromMe: true,
      timestamp,
    });
  }

  return result;
}

export async function initWhatsApp(events: WhatsAppEvents): Promise<WASocket | null> {
  registeredEvents = events;
  currentStatus = 'connecting';
  events.onStatusChange('connecting');

  try {
    const supabase = getSupabaseClient();
    const { state, saveCreds } = await useSupabaseAuthState(supabase);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => true,
      generateHighQualityLinkPreview: false,
    });

    socketInstance = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = qr;
        lastError = null;
        events.onQrCode(qr);
      }

      if (connection === 'close') {
        currentQr = null;
        currentStatus = 'disconnected';
        currentUserPhone = null;
        events.onStatusChange('disconnected');

        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const errMessage = (lastDisconnect?.error as any)?.message || 'Connection closed';
        lastError = { statusCode, message: errMessage, time: new Date().toISOString() };

        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        if (isLoggedOut) {
          // Clear stale revoked auth from Supabase so fresh QR code can be generated
          try {
            await supabase.from('baileys_auth_store').delete().neq('id', '');
          } catch {}
        }

        // Always attempt reconnect/fresh session so new QR code can be generated
        if (!isReconnecting) {
          isReconnecting = true;
          setTimeout(() => {
            isReconnecting = false;
            initWhatsApp(events).catch((err) => {
              console.error('Reconnect failed, retrying in 5s...', err);
            });
          }, 3000);
        }
      } else if (connection === 'open') {
        currentQr = null;
        lastError = null;
        currentStatus = 'connected';
        const userJid = sock.user?.id || '';
        currentUserPhone = extractPhoneNumber(userJid);
        events.onStatusChange('connected', currentUserPhone);
      }
    });

    // Handle initial WhatsApp history sync (contacts, recent chats & messages)
    sock.ev.on('messaging-history.set', async ({ chats, contacts: syncedContacts, messages: syncedMessages }) => {
      try {
        const contactMap = new Map<string, {
          jid: string;
          phone_number: string;
          name: string | null;
          push_name: string | null;
          last_message_text?: string | null;
          last_message_at?: string | null;
          last_sender_is_me?: boolean;
        }>();

        // 1. Process contacts list
        if (syncedContacts) {
          for (const c of syncedContacts) {
            const jid = c.id;
            if (!jid || !isValidDirectChatJid(jid)) continue;
            const phone = extractPhoneNumber(jid);
            const name = c.name || (c as any).notify || (c as any).verifiedName || null;
            contactMap.set(jid, {
              jid,
              phone_number: phone,
              name,
              push_name: (c as any).notify || null,
            });
          }
        }

        // 2. Process chats list
        if (chats) {
          for (const chat of chats) {
            const jid = chat.id;
            if (!jid || !isValidDirectChatJid(jid)) continue;
            const phone = extractPhoneNumber(jid);
            const existing = contactMap.get(jid);
            const chatName = chat.name || existing?.name || null;
            const chatTimestamp = chat.conversationTimestamp
              ? new Date((Number(chat.conversationTimestamp) || Date.now() / 1000) * 1000).toISOString()
              : undefined;

            contactMap.set(jid, {
              jid,
              phone_number: phone,
              name: chatName,
              push_name: existing?.push_name || null,
              last_message_at: chatTimestamp || existing?.last_message_at,
            });
          }
        }

        // 3. Process synced messages (extract latest text for each 1-on-1 chat)
        if (syncedMessages) {
          for (const msg of syncedMessages) {
            const jid = msg.key.remoteJid;
            if (!jid || !isValidDirectChatJid(jid)) continue;
            const phone = extractPhoneNumber(jid);
            const fromMe = Boolean(msg.key.fromMe);
            const mObj = msg.message;
            let text =
              mObj?.conversation ||
              mObj?.extendedTextMessage?.text ||
              mObj?.imageMessage?.caption ||
              mObj?.videoMessage?.caption ||
              mObj?.documentMessage?.caption ||
              '';

            if (!text) {
              if (mObj?.imageMessage) text = '📷 [Gambar]';
              else if (mObj?.videoMessage) text = '🎬 [Video]';
              else if (mObj?.audioMessage) text = '🎵 [Pesan Suara]';
              else if (mObj?.documentMessage) text = `📄 [Dokumen: ${mObj.documentMessage.fileName || 'Berkas'}]`;
              else if (mObj?.stickerMessage) text = '🎨 [Stiker]';
              else if (mObj?.locationMessage) text = '📍 [Lokasi]';
              else if (mObj?.contactMessage) text = '👤 [Kontak]';
            }

            const timestamp = new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000).toISOString();
            const pushName = msg.pushName || undefined;

            const existing = contactMap.get(jid);
            if (!existing?.last_message_at || new Date(timestamp) >= new Date(existing.last_message_at)) {
              contactMap.set(jid, {
                jid,
                phone_number: phone,
                name: existing?.name || pushName || phone,
                push_name: pushName || existing?.push_name || null,
                last_message_text: text || existing?.last_message_text || null,
                last_message_at: timestamp,
                last_sender_is_me: fromMe,
              });
            }
          }
        }

        // Batch upsert up to 100 direct contacts into Supabase
        if (contactMap.size > 0) {
          const rows = Array.from(contactMap.values()).map((c) => ({
            jid: c.jid,
            phone_number: c.phone_number,
            name: c.name || c.push_name || c.phone_number,
            push_name: c.push_name || null,
            is_customer: false, // Default to Triage
            is_group: false,
            last_message_text: c.last_message_text || null,
            last_message_at: c.last_message_at || new Date().toISOString(),
            last_sender_is_me: c.last_sender_is_me ?? false,
            updated_at: new Date().toISOString(),
          }));

          for (let i = 0; i < rows.length; i += 50) {
            const chunk = rows.slice(i, i + 50);
            await supabase.from('contacts').upsert(chunk, { onConflict: 'jid' });
          }

          // Broadcast sync complete to reload client UI
          events.onMessageReceived({
            jid: 'sync',
            senderNumber: 'system',
            text: 'sync_complete',
            fromMe: false,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (syncErr) {
        console.error('Error during messaging-history.set sync:', syncErr);
      }
    });

    // Handle contacts.upsert
    sock.ev.on('contacts.upsert', async (newContacts) => {
      try {
        const rows: any[] = [];
        for (const c of newContacts) {
          const jid = c.id;
          if (!jid || !isValidDirectChatJid(jid)) continue;
          const phone = extractPhoneNumber(jid);
          const name = c.name || (c as any).notify || (c as any).verifiedName || null;
          rows.push({
            jid,
            phone_number: phone,
            name: name || phone,
            push_name: (c as any).notify || null,
            is_customer: false,
            is_group: false,
            updated_at: new Date().toISOString(),
          });
        }
        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 50) {
            await supabase.from('contacts').upsert(rows.slice(i, i + 50), { onConflict: 'jid' });
          }
          events.onMessageReceived({
            jid: 'sync',
            senderNumber: 'system',
            text: 'contacts_synced',
            fromMe: false,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {}
    });

    // Handle chats.upsert
    sock.ev.on('chats.upsert', async (newChats) => {
      try {
        const rows: any[] = [];
        for (const chat of newChats) {
          const jid = chat.id;
          if (!jid || !isValidDirectChatJid(jid)) continue;
          const phone = extractPhoneNumber(jid);
          const chatTimestamp = chat.conversationTimestamp
            ? new Date((Number(chat.conversationTimestamp) || Date.now() / 1000) * 1000).toISOString()
            : new Date().toISOString();

          rows.push({
            jid,
            phone_number: phone,
            name: chat.name || phone,
            is_customer: false,
            is_group: false,
            last_message_at: chatTimestamp,
            updated_at: new Date().toISOString(),
          });
        }
        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 50) {
            await supabase.from('contacts').upsert(rows.slice(i, i + 50), { onConflict: 'jid' });
          }
          events.onMessageReceived({
            jid: 'sync',
            senderNumber: 'system',
            text: 'chats_synced',
            fromMe: false,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {}
    });

    sock.ev.on('messages.upsert', async (m) => {
      if (!m.messages || m.messages.length === 0) return;

      for (const msg of m.messages) {
        const jid = msg.key.remoteJid;
        if (!jid || !isValidDirectChatJid(jid)) {
          // Strictly ignore groups (@g.us), status stories (status@broadcast), and channels (@newsletter)
          continue;
        }

        const fromMe = Boolean(msg.key.fromMe);
        const mObj = msg.message;
        let text =
          mObj?.conversation ||
          mObj?.extendedTextMessage?.text ||
          mObj?.imageMessage?.caption ||
          mObj?.videoMessage?.caption ||
          mObj?.documentMessage?.caption ||
          '';

        if (!text) {
          if (mObj?.imageMessage) text = '📷 [Gambar]';
          else if (mObj?.videoMessage) text = '🎬 [Video]';
          else if (mObj?.audioMessage) text = '🎵 [Pesan Suara]';
          else if (mObj?.documentMessage) text = `📄 [Dokumen: ${mObj.documentMessage.fileName || 'Berkas'}]`;
          else if (mObj?.stickerMessage) text = '🎨 [Stiker]';
          else if (mObj?.locationMessage) text = '📍 [Lokasi]';
          else if (mObj?.contactMessage) text = '👤 [Kontak]';
        }

        const timestamp = new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000).toISOString();
        const senderNumber = extractPhoneNumber(jid);
        const pushName = msg.pushName || undefined;

        // Persist / update contact in Supabase
        try {
          const { data: existing } = await supabase
            .from('contacts')
            .select('is_customer, name, last_message_text')
            .eq('jid', jid)
            .single();

          const finalMessageText = text || existing?.last_message_text || null;

          await supabase.from('contacts').upsert({
            jid,
            phone_number: senderNumber,
            push_name: pushName || null,
            name: existing?.name || pushName || senderNumber,
            is_customer: existing?.is_customer ?? false, // Default to FALSE (triage)
            is_group: false,
            last_message_text: finalMessageText,
            last_message_at: timestamp,
            last_sender_is_me: fromMe,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Non-blocking error handling for socket resilience
        }

        events.onMessageReceived({
          jid,
          senderNumber,
          text,
          fromMe,
          timestamp,
          pushName,
        });
      }
    });

    return sock;
  } catch (err: any) {
    lastError = { message: err?.message || String(err), time: new Date().toISOString() };
    currentStatus = 'disconnected';
    events.onStatusChange('disconnected');

    // Auto retry after 5 seconds if initial boot fails
    if (!isReconnecting) {
      isReconnecting = true;
      setTimeout(() => {
        isReconnecting = false;
        initWhatsApp(events).catch(() => {});
      }, 5000);
    }
    return null;
  }
}
