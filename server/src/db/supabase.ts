import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Ensure global WebSocket is available in Node runtimes (required by Supabase & Baileys)
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

dotenv.config();

export interface ContactRow {
  jid: string;
  phone_number: string;
  name: string | null;
  push_name: string | null;
  is_customer: boolean;
  is_group: boolean;
  pipeline_stage: 'lead_baru' | 'sedang_diskusi' | 'closing' | 'lost';
  temperature: 'hot' | 'warm' | 'cold';
  tags: string[];
  internal_notes: string;
  last_message_text: string | null;
  last_message_at: string | null;
  last_sender_is_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowUpReminderRow {
  id: string;
  contact_jid: string;
  scheduled_at: string;
  note: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface QuickReplyRow {
  id: string;
  title: string;
  template_text: string;
  category: string;
  created_at: string;
}

export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

let supabaseInstance: SupabaseClient<any> | null = null;

export function getSupabaseClient(): SupabaseClient<any> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const rawUrl = process.env.SUPABASE_URL || 'https://mock-supabase.supabase.co';
  const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key').trim();

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: {
      transport: WebSocket as any,
    },
  });

  return supabaseInstance;
}
