export type SlaStatus = 'belum_dibalas' | 'perlu_followup' | 'menunggu_respon' | 'idle';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

export function isValidDirectChatJid(jid: string): boolean {
  // Only individual direct 1-on-1 chats are tracked.
  // Excludes groups (@g.us), status stories (status@broadcast), and channels (@newsletter).
  return jid.endsWith('@s.whatsapp.net');
}

export function extractPhoneNumber(jidOrPhone: string): string {
  const cleaned = jidOrPhone.split('@')[0];
  return cleaned.replace(/\D/g, '');
}

export function computeSlaStatus(
  lastMessageAt: Date | string | null,
  lastSenderIsMe: boolean,
  now: Date = new Date()
): SlaStatus {
  if (!lastMessageAt) {
    return 'idle';
  }

  const msgTime = typeof lastMessageAt === 'string' ? new Date(lastMessageAt).getTime() : lastMessageAt.getTime();
  const diff = now.getTime() - msgTime;

  if (!lastSenderIsMe) {
    // Last message was from customer
    if (diff > TWO_HOURS_MS) {
      return 'belum_dibalas';
    }
    return 'menunggu_respon';
  } else {
    // Last message was from sales representative
    if (diff > THREE_DAYS_MS) {
      return 'perlu_followup';
    }
    return 'menunggu_respon';
  }
}
