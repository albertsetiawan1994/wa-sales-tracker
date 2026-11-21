export type PipelineStage = 'lead_baru' | 'sedang_diskusi' | 'closing' | 'lost';
export type SlaStatus = 'belum_dibalas' | 'perlu_followup' | 'menunggu_respon' | 'idle';
export type Temperature = 'hot' | 'warm' | 'cold';

export interface Contact {
  jid: string;
  phone_number: string;
  name: string | null;
  push_name: string | null;
  is_customer: boolean;
  is_group: boolean;
  pipeline_stage: PipelineStage;
  temperature: Temperature;
  tags: string[];
  internal_notes: string;
  last_message_text: string | null;
  last_message_at: string | null;
  last_sender_is_me: boolean;
  sla_status?: SlaStatus;
  created_at: string;
  updated_at: string;
}

export interface QuickReply {
  id: string;
  title: string;
  template_text: string;
  category: string;
  created_at: string;
}

export interface FollowUpReminder {
  id: string;
  contact_jid: string;
  scheduled_at: string;
  note: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface WhatsAppConnectionState {
  status: 'connecting' | 'connected' | 'disconnected';
  qrCode: string | null;
  userPhone: string | null;
  lastError?: {
    statusCode?: number;
    message?: string;
    time?: string;
  } | null;
}
