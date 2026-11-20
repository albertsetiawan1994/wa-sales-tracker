import { describe, it, expect } from 'vitest';
import {
  computeSlaStatus,
  isGroupJid,
  isValidDirectChatJid,
  extractPhoneNumber,
} from '../src/whatsapp/status-engine.js';

describe('Task 3: Conversational SLA Detection & Message Utilities', () => {
  const baseNow = new Date('2026-11-20T12:00:00Z');

  it('identifies valid 1-on-1 direct chats vs groups/broadcasts/channels', () => {
    expect(isValidDirectChatJid('628123456789@s.whatsapp.net')).toBe(true);
    expect(isValidDirectChatJid('12345678-987654@g.us')).toBe(false); // Groups
    expect(isValidDirectChatJid('status@broadcast')).toBe(false); // Status stories
    expect(isValidDirectChatJid('1234567890@newsletter')).toBe(false); // Channels
    expect(isGroupJid('12345678-987654@g.us')).toBe(true);
  });

  it('extracts clean phone number from jid', () => {
    expect(extractPhoneNumber('628123456789@s.whatsapp.net')).toBe('628123456789');
    expect(extractPhoneNumber('+62 812-3456-7890')).toBe('6281234567890');
  });

  it('returns idle if no messages have ever been exchanged', () => {
    expect(computeSlaStatus(null, false, baseNow)).toBe('idle');
  });

  it('detects belum_dibalas when customer sent last message > 2 hours ago', () => {
    // 3 hours ago from customer
    const lastMsgTime = new Date('2026-11-20T09:00:00Z');
    expect(computeSlaStatus(lastMsgTime, false, baseNow)).toBe('belum_dibalas');
  });

  it('detects menunggu_respon when customer sent last message < 2 hours ago', () => {
    // 45 minutes ago from customer
    const lastMsgTime = new Date('2026-11-20T11:15:00Z');
    expect(computeSlaStatus(lastMsgTime, false, baseNow)).toBe('menunggu_respon');
  });

  it('detects perlu_followup when sales sent last message > 3 days ago', () => {
    // 4 days ago from sales rep
    const lastMsgTime = new Date('2026-11-16T12:00:00Z');
    expect(computeSlaStatus(lastMsgTime, true, baseNow)).toBe('perlu_followup');
  });

  it('detects menunggu_respon when sales sent last message < 3 days ago', () => {
    // 1 day ago from sales rep
    const lastMsgTime = new Date('2026-11-19T12:00:00Z');
    expect(computeSlaStatus(lastMsgTime, true, baseNow)).toBe('menunggu_respon');
  });
});
