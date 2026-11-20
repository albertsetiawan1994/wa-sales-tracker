import makeWASocket, {
  DisconnectReason,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { getSupabaseClient } from '../db/supabase.js';
import { useSupabaseAuthState } from '../db/auth-store.js';
import { isGroupJid, extractPhoneNumber } from './status-engine.js';

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

export function getWhatsAppState() {
  return {
    status: currentStatus,
    qrCode: currentQr,
    userPhone: currentUserPhone,
  };
}

export async function initWhatsApp(events: WhatsAppEvents): Promise<WASocket> {
  const supabase = getSupabaseClient();
  const { state, saveCreds } = await useSupabaseAuthState(supabase);

  currentStatus = 'connecting';
  events.onStatusChange('connecting');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    syncFullHistory: false, // Essential: prevents memory exhaustion on Koyeb 512MB RAM
    generateHighQualityLinkPreview: false,
  });

  socketInstance = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      events.onQrCode(qr);
    }

    if (connection === 'close') {
      currentQr = null;
      currentStatus = 'disconnected';
      currentUserPhone = null;
      events.onStatusChange('disconnected');

      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        setTimeout(() => {
          initWhatsApp(events).catch(() => {});
        }, 5000);
      }
    } else if (connection === 'open') {
      currentQr = null;
      currentStatus = 'connected';
      const userJid = sock.user?.id || '';
      currentUserPhone = extractPhoneNumber(userJid);
      events.onStatusChange('connected', currentUserPhone);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (!m.messages || m.messages.length === 0) return;

    for (const msg of m.messages) {
      const jid = msg.key.remoteJid;
      if (!jid || isGroupJid(jid)) {
        // Strictly ignore WhatsApp group chats for personal number isolation
        continue;
      }

      const fromMe = Boolean(msg.key.fromMe);
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      const timestamp = new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000).toISOString();
      const senderNumber = extractPhoneNumber(jid);
      const pushName = msg.pushName || undefined;

      // Persist / update contact in Supabase
      try {
        const { data: existing } = await supabase
          .from('contacts')
          .select('is_customer, name')
          .eq('jid', jid)
          .single();

        await supabase.from('contacts').upsert({
          jid,
          phone_number: senderNumber,
          push_name: pushName || null,
          name: existing?.name || pushName || senderNumber,
          is_customer: existing?.is_customer ?? false, // Default to FALSE (triage)
          is_group: false,
          last_message_text: text || null,
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
}
