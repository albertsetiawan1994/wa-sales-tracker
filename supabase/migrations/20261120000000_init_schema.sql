-- ==============================================================================
-- WhatsApp Sales Tracker Initial Schema Migration
-- ==============================================================================

-- 1. Baileys Multi-Device Persistent Authentication Store
CREATE TABLE IF NOT EXISTS baileys_auth_store (
    id TEXT PRIMARY KEY,
    session_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Contacts / Sales Leads Table
CREATE TABLE IF NOT EXISTS contacts (
    jid TEXT PRIMARY KEY, -- e.g. '62812345678@s.whatsapp.net'
    phone_number TEXT NOT NULL,
    name TEXT,
    push_name TEXT,
    is_customer BOOLEAN DEFAULT FALSE, -- Default FALSE for personal number safety
    is_group BOOLEAN DEFAULT FALSE,
    pipeline_stage TEXT DEFAULT 'lead_baru', -- 'lead_baru', 'sedang_diskusi', 'closing', 'lost'
    temperature TEXT DEFAULT 'warm', -- 'hot', 'warm', 'cold'
    tags TEXT[] DEFAULT '{}',
    internal_notes TEXT DEFAULT '',
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_sender_is_me BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_contacts_is_customer ON contacts(is_customer);
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON contacts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_last_message_at ON contacts(last_message_at DESC);

-- 3. Scheduled Follow-up Reminders
CREATE TABLE IF NOT EXISTS follow_up_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_jid TEXT REFERENCES contacts(jid) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON follow_up_reminders(scheduled_at, is_completed);

-- 4. Quick Reply Templates
CREATE TABLE IF NOT EXISTS quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    template_text TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed basic sales quick replies
INSERT INTO quick_replies (title, template_text, category) VALUES
('Sapaan Follow-up Hangat', 'Halo Kak [Nama], menyambung diskusi kita kemarin terkait produk kami, apakah ada yang bisa saya bantu jelaskan lebih lanjut?', 'Follow-up'),
('Konfirmasi Pembayaran', 'Halo Kak [Nama], terima kasih sudah memesan! Berikut rincian rekening transfer untuk penyelesaian pesanan...', 'Closing'),
('Cek Ketersediaan / Stok', 'Halo Kak [Nama], untuk produk yang kemarin ditanyakan kebetulan stoknya masih ready ya. Apakah ingin kami siapkan pengirimannya?', 'Follow-up')
ON CONFLICT DO NOTHING;
