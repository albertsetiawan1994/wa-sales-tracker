import { Contact, QuickReply, FollowUpReminder, WhatsAppConnectionState } from './types.js';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = BASE_URL ? `${BASE_URL}/api` : '/api';

export function getStoredPin(): string {
  return localStorage.getItem('app_pin') || '';
}

export function setStoredPin(pin: string): void {
  localStorage.setItem('app_pin', pin);
}

export function clearStoredPin(): void {
  localStorage.removeItem('app_pin');
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

function handleAuthError(res: Response) {
  if (res.status === 401) {
    clearStoredPin();
    window.dispatchEvent(new CustomEvent('auth_required', { detail: 'Sesi berakhir atau PIN salah. Silakan masukkan PIN kembali.' }));
    throw new Error('UNAUTHORIZED');
  }
}

export async function fetchConnectionStatus(): Promise<WhatsAppConnectionState> {
  const res = await fetch(`${API_BASE}/status`, { headers: getHeaders() });
  handleAuthError(res);
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
  handleAuthError(res);
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
}

export async function updateContact(jid: string, updates: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`${API_BASE}/contacts/${encodeURIComponent(jid)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Failed to update contact');
  return res.json();
}

export async function fetchQuickReplies(): Promise<QuickReply[]> {
  const res = await fetch(`${API_BASE}/quick-replies`, { headers: getHeaders() });
  handleAuthError(res);
  if (!res.ok) throw new Error('Failed to fetch quick replies');
  return res.json();
}

export async function createQuickReply(reply: { title: string; template_text: string; category?: string }): Promise<QuickReply> {
  const res = await fetch(`${API_BASE}/quick-replies`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(reply),
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Failed to create quick reply');
  return res.json();
}

export async function fetchReminders(contactJid?: string): Promise<FollowUpReminder[]> {
  const url = contactJid
    ? `${API_BASE}/reminders?contact_jid=${encodeURIComponent(contactJid)}`
    : `${API_BASE}/reminders`;
  const res = await fetch(url, { headers: getHeaders() });
  handleAuthError(res);
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
  handleAuthError(res);
  if (!res.ok) throw new Error('Failed to create reminder');
  return res.json();
}
