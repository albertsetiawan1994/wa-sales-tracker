import { Contact, QuickReply, FollowUpReminder, WhatsAppConnectionState } from './types.js';

const API_BASE = '/api';

export function getStoredPin(): string {
  return localStorage.getItem('app_pin') || '';
}

export function setStoredPin(pin: string): void {
  localStorage.setItem('app_pin', pin);
}

function getHeaders(): HeadersInit {
  const pin = getStoredPin();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (pin) {
    headers['x-app-pin'] = pin;
  }
  return headers;
}

export async function fetchConnectionStatus(): Promise<WhatsAppConnectionState> {
  const res = await fetch(`${API_BASE}/status`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function fetchContacts(params?: {
  is_customer?: boolean;
  pipeline_stage?: string;
  search?: string;
}): Promise<Contact[]> {
  const query = new URLSearchParams();
  if (params?.is_customer !== undefined) {
    query.set('is_customer', String(params.is_customer));
  }
  if (params?.pipeline_stage) {
    query.set('pipeline_stage', params.pipeline_stage);
  }
  if (params?.search) {
    query.set('search', params.search);
  }

  const res = await fetch(`${API_BASE}/contacts?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
}

export async function updateContact(jid: string, updates: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`${API_BASE}/contacts/${encodeURIComponent(jid)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update contact');
  return res.json();
}

export async function fetchQuickReplies(): Promise<QuickReply[]> {
  const res = await fetch(`${API_BASE}/quick-replies`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch quick replies');
  return res.json();
}

export async function createQuickReply(reply: { title: string; template_text: string; category?: string }): Promise<QuickReply> {
  const res = await fetch(`${API_BASE}/quick-replies`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(reply),
  });
  if (!res.ok) throw new Error('Failed to create quick reply');
  return res.json();
}

export async function fetchReminders(contactJid?: string): Promise<FollowUpReminder[]> {
  const url = contactJid
    ? `${API_BASE}/reminders?contact_jid=${encodeURIComponent(contactJid)}`
    : `${API_BASE}/reminders`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch reminders');
  return res.json();
}

export async function createReminder(reminder: {
  contact_jid: string;
  scheduled_at: string;
  note?: string;
}): Promise<FollowUpReminder> {
  const res = await fetch(`${API_BASE}/reminders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(reminder),
  });
  if (!res.ok) throw new Error('Failed to create reminder');
  return res.json();
}
