import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

export interface Database {
  public: {
    Tables: {
      baileys_auth_store: {
        Row: {
          id: string;
          session_data: any;
          updated_at: string;
        };
        Insert: {
          id: string;
          session_data: any;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_data?: any;
          updated_at?: string;
        };
      };
      contacts: {
        Row: ContactRow;
        Insert: Partial<ContactRow> & { jid: string; phone_number: string };
        Update: Partial<ContactRow>;
      };
      follow_up_reminders: {
        Row: FollowUpReminderRow;
        Insert: Partial<FollowUpReminderRow> & { contact_jid: string; scheduled_at: string };
        Update: Partial<FollowUpReminderRow>;
      };
      quick_replies: {
        Row: QuickReplyRow;
        Insert: Partial<QuickReplyRow> & { title: string; template_text: string };
        Update: Partial<QuickReplyRow>;
      };
    };
  };
}

let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mock-supabase.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  return supabaseInstance;
}
