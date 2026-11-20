# Design Document: WhatsApp Sales Tracker

**Date:** 2026-11-20  
**Status:** Ready for Human Approval  
**Target Environment:** Cloudflare Pages (Frontend) + Koyeb (Backend Node.js) + Supabase (PostgreSQL DB)  
**Client Environment:** Accessible via standard modern Web Browser on Windows 7 32-bit (Chrome / Firefox / Supermium) or mobile.

---

## 1. Executive Summary & Intent

### 1.1 The Problem
A sales representative managing dozens of prospective customer conversations on WhatsApp struggles to track interaction states manually:
- Leads get neglected or forgotten.
- Customers waiting for quotations or replies go unnoticed after hours.
- Promises made to follow up (e.g. "I'll check back on Monday") are missed.
- Work contacts get buried beneath personal family/group chats.
- Desktop environments running Windows 7 (32-bit) cannot install modern Electron/Node 18+ desktop software.

### 1.2 The Solution
A lightweight, modern, cloud-hosted **WhatsApp Sales Tracker & Mini-CRM**:
- **Onboarding:** Zero complex API setups. The sales rep simply opens the web app and scans a WhatsApp QR code on screen (via Baileys multi-device socket).
- **Automation:** The app classifies chats in real time into clear action categories (`Belum Dibalas`, `Perlu Follow-up`, `Menunggu Respon`, `Deal/Closing`).
- **Dashboard:** Dual views (Kanban pipeline & tabular list) with lead temperatures (`Hot`, `Warm`, `Cold`), tags (`#VIP`, `#MintaDiskon`), private internal notes, and follow-up alerts.
- **Cost:** Fully operable within permanent **100% Free Tiers** across Cloudflare Pages, Koyeb, and Supabase.

---

## 2. Goals, Non-Goals, and Anti-Goals

### 2.1 Goals
- Provide real-time two-way synchronization with the sales rep's WhatsApp account via QR scan.
- Automatically flag conversations needing immediate attention:
  - Inbound messages from customers with no reply $> 2$ hours $\rightarrow$ `Belum Dibalas`.
  - Outbound messages from sales with no customer reply $> 3$ days $\rightarrow$ `Perlu Follow-up`.
- Offer a Kanban sales funnel view (*Lead Baru $\rightarrow$ Sedang Diskusi $\rightarrow$ Perlu Follow-up $\rightarrow$ Deal / Lost*).
- Support contact separation: filter out personal chats / family groups and only track designated sales prospects.
- Store internal sales notes and customizable tags for every customer contact.
- Provide Quick Reply templates for rapid, personalized follow-ups.
- Keep the entire system operational within zero-cost tiers (Cloudflare Pages + Koyeb 512MB + Supabase 500MB).

### 2.2 Non-Goals
- Mass unsolicited bulk broadcasting (anti-spam, risk of WhatsApp ban).
- Full WhatsApp Web chat client replacement (we focus on tracking, status management, notes, and alerts; detailed complex media editing remains in the native WhatsApp app if needed).
- Native desktop installer packaging for Windows 7 (since modern web browser access eliminates all OS compatibility and RAM issues).

### 2.3 Anti-Goals
- Never trigger WhatsApp account bans by avoiding aggressive automated messaging, scraping, or spamming.
- Never lose WhatsApp session authentication on server container restarts (session must persist in Supabase).
- Never expose unauthenticated public access to the dashboard (the web app must have PIN/password protection).

---

## 3. Approaches Considered & Selected Architecture

### 3.1 Approaches Evaluated
1. **Approach A: Native Desktop App (Electron v22 Legacy 32-bit)**
   - *Pros:* Offline desktop `.exe`.
   - *Cons:* Heavy RAM footprint on Windows 7; deprecated Electron version with security vulnerabilities; inaccessible from phone/mobile.
   - *Verdict:* Dropped.
2. **Approach B: Local Web Server via Cloudflare Tunnel**
   - *Pros:* 100% free, session stored on local disk, zero cloud setup.
   - *Cons:* PC must be powered on 24/7 if user wants to monitor from mobile when away from desk.
   - *Verdict:* Viable, but user preferred full cloud hosting.
3. **Approach C (Selected): Cloudflare Pages (Frontend) + Koyeb (Backend) + Supabase (Database)**
   - *Pros:* Runs 24/7 in the cloud without PC dependency; 100% free; persistent session in Postgres; responsive on any device (Windows 7 browser, smartphone, tablet).
   - *Verdict:* Selected by user.

### 3.2 System Architecture Diagram

```
+-----------------------------------------------------------+
|                      USER CLIENTS                         |
|   Windows 7 Browser (Chrome/Firefox)  /  Mobile Browser   |
+-----------------------------------------------------------+
                             |
                   HTTPS (Cloudflare CDN)
                             v
+-----------------------------------------------------------+
|          FRONTEND: Cloudflare Pages (Static SPA)          |
|  - React 19 + TypeScript + Tailwind CSS + Lucide Icons    |
|  - Real-time SSE / WebSocket connection to Backend        |
|  - Kanban Board, List View, Quick Replies, Alarms         |
+-----------------------------------------------------------+
                             |
             REST API & WebSocket (Secure HTTPS)
                             v
+-----------------------------------------------------------+
|          BACKEND: Koyeb Server (Node.js 20)               |
|  - Baileys WhatsApp Multi-Device Socket                   |
|  - WhatsApp QR Code Generator & Session Manager           |
|  - Rule-Based Status Detection & Event Dispatcher         |
|  - Auth Middleware (JWT / App PIN Protection)             |
+-----------------------------------------------------------+
                             |
                 PostgreSQL Connection (Pool)
                             v
+-----------------------------------------------------------+
|          DATABASE: Supabase (PostgreSQL 500MB)            |
|  - baileys_auth_store (Session tokens, creds, pre-keys)   |
|  - contacts (Leads, status, tags, notes, temperature)     |
|  - message_logs (Recent message timestamps & metadata)    |
|  - follow_up_reminders (Scheduled reminders)              |
|  - quick_replies (Templates)                              |
+-----------------------------------------------------------+
```

---

## 4. Detailed Feature Specifications

### 4.1 Onboarding & QR Authentication
- When unlinked, the frontend displays an interactive QR code received via WebSocket from the Koyeb backend.
- The user opens WhatsApp on their phone $\rightarrow$ Linked Devices $\rightarrow$ Link a Device $\rightarrow$ Scans QR.
- Upon successful pairing, Baileys saves authentication credentials directly into the Supabase `baileys_auth_store` table.
- If the Koyeb container restarts or redeploys, Baileys restores authentication state from Supabase without requiring a re-scan.

### 4.2 Lead & Chat Status Auto-Detection Engine
The system cleanly separates **Pipeline Stage** (where the prospect is in the sales cycle) from **Conversational SLA Status** (immediate action requirement):

1. **Pipeline Stages (`pipeline_stage` - Kanban Columns):**
   - `lead_baru`: Newly synced or incoming prospective customer.
   - `sedang_diskusi`: Active negotiation, product explanation, or price quoting.
   - `closing`: Order confirmation, waiting for payment transfer.
   - `lost`: Deal cancelled or dropped out.

2. **Conversational SLA Status (`sla_status` - Dynamic Triage Badges):**
   - `belum_dibalas`: Last message is from customer (`last_sender_is_me == false`) and $> 2$ hours elapsed without reply. Marked with a high-priority red alert badge `[!]`.
   - `perlu_followup`: Last message is from sales (`last_sender_is_me == true`) and $> 3$ days elapsed without customer response. Marked with an orange warning badge `[~]`.
   - `menunggu_respon`: Sales sent message $< 3$ days ago. Normal waiting state `[✓]`.
   - *Architecture Note:* Evaluated dynamically on query (`NOW() - last_message_at`) to eliminate background cron job overhead and conserve Supabase free-tier limits.

### 4.3 Onboarding & Sync Optimization
- **Historical Sync Control:** Baileys is configured with `syncFullHistory: false`. It only loads active recent chats (last 7 days) and real-time events forward. This prevents memory spikes (safely within Koyeb's 512MB RAM) and keeps database storage well under 20MB.
- **Alert Channel:** Real-time in-app dashboard alerts, category counters, and optional browser audio/desktop notifications while the tab is open.

### 4.4 Personal Number Isolation & Lead Qualification (Triage Workflow)
Because the sales representative connects a **personal WhatsApp number** (mixing family, friends, personal groups, and business leads):
1. **Automated Group Chat Exclusion:**
   - All WhatsApp group chats (`@g.us`) are flagged as `is_group = true` and strictly excluded from the sales tracker.
2. **Two-Tier Contact Classification:**
   - **Triage / Inbox Tab (`is_customer = false`):** Newly synced 1-on-1 chats or chats not yet qualified. They do not clutter the sales board and do not trigger false SLA alarms.
   - **One-Click Promotion:** A simple toggle or button on any chat row: `[+ Jadikan Pelanggan]` promotes the contact (`is_customer = true`), entering them into the Kanban pipeline and enabling follow-up tracking.
   - **Ignore / Personal:** Marking a contact as `[Abaikan / Kontak Pribadi]` keeps them permanently out of sales alerts.
3. **SLA Protection:** Only qualified customer contacts (`is_customer = true`) trigger `Belum Dibalas` and `Perlu Follow-up` counters and audio alarms.

### 4.5 Sales Workspace UI (Frontend)
- **View Navigation:**
  - **Pipeline Kanban:** Drag-and-drop funnel columns (*Lead Baru $\rightarrow$ Sedang Diskusi $\rightarrow$ Closing $\rightarrow$ Lost*).
  - **Daftar Pelanggan (Table View):** Tabular list with quick sorting, filters, and SLA indicators.
  - **Kotak Masuk / Triage:** Review incoming chats from non-customers to quickly qualify or dismiss.
- **Contact Filtering & Privacy:**
  - Quick Search: By customer name, phone number, or tag.
  - Privacy Mode (*Masking*): Blurs phone numbers and message snippets on screen with a single click.
- **Lead Detail Drawer:**
  - Lead Temperature selector: **🔥 Hot**, **⚡ Warm**, **❄️ Cold**.
  - Custom Tagging: `#VIP`, `#ProspekPanas`, `#PendingTransfer`, `#MintaDiskon`.
  - Internal Private Notes: Multiline markdown/text notes stored only in Supabase.
  - Follow-up Scheduler: Date & time picker to set reminder alarms.
- **Quick Reply Drawer:**
  - Searchable list of saved response templates.
  - Copy-to-clipboard button with customer name automatically inserted (e.g., `Halo Bpk/Ibu [Nama], ...`).
  - Direct "Kirim ke WA" deep-link (`https://wa.me/<phone>?text=...`).

---

## 5. Database Schema (Supabase PostgreSQL)

```sql
-- 1. Baileys Session Storage (for persistent authentication across Koyeb restarts)
CREATE TABLE baileys_auth_store (
    id TEXT PRIMARY KEY,
    session_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Contacts / Leads Management
CREATE TABLE contacts (
    jid TEXT PRIMARY KEY, -- e.g. '62812345678@s.whatsapp.net'
    phone_number TEXT NOT NULL,
    name TEXT,
    push_name TEXT,
    is_customer BOOLEAN DEFAULT FALSE, -- Default false for personal number safety
    is_group BOOLEAN DEFAULT FALSE,
    pipeline_stage TEXT DEFAULT 'lead_baru', -- 'lead_baru', 'sedang_diskusi', 'closing', 'lost'
    temperature TEXT DEFAULT 'warm', -- 'hot', 'warm', 'cold'
    tags TEXT[] DEFAULT '{}',
    internal_notes TEXT DEFAULT '',
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_sender_is_me BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Scheduled Follow-up Reminders
CREATE TABLE follow_up_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_jid TEXT REFERENCES contacts(jid) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Quick Reply Templates
CREATE TABLE quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    template_text TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. Security & Privacy Safeguards
- **PIN / Master Password:** Frontend requires a password or PIN to unlock the dashboard, ensuring no unauthorized visitor can view sales data on the public Cloudflare URL.
- **End-to-End Integrity:** Baileys communicates directly with WhatsApp over official Noise protocol sockets.
- **Data Boundary:** Only metadata, lead status, notes, and the most recent message snippet are persisted. Full media files (images, audio, video) are not stored in Supabase to strictly honor the 500MB free database tier.

---

## 7. What is Left to the Builder
- Selection between Express vs Fastify for the lightweight Node.js API.
- Exact WebSocket/SSE protocol implementation between Koyeb backend and Cloudflare Pages frontend.
- Visual theme, color palette, and micro-interactions (Tailwind styling).
- Timing thresholds customization for `Belum Dibalas` and `Perlu Follow-up` via a Settings UI.
