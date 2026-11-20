# WhatsApp Sales Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern, cloud-hosted WhatsApp Sales Tracker & Mini-CRM that lets a sales rep monitor customer conversation states, prevent missed follow-ups, and isolate personal chats via QR scan on a 100% free cloud stack (Cloudflare Pages + Koyeb + Supabase).

**Architecture:** Monorepo containing a React 19 + Tailwind SPA (`client/`) deployable to Cloudflare Pages and an Express/WebSocket service (`server/`) with Baileys deployable to Koyeb Free Tier, using Supabase PostgreSQL to persist authentication keys, contacts, notes, and reminders.

**Tech Stack:** TypeScript, Node.js 20, `@whiskeysockets/baileys`, Express, `ws`, `@supabase/supabase-js`, React 19, Vite, Tailwind CSS v4, Lucide Icons, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-20-whatsapp-sales-tracker-design.md](file:///d:/wispr-clone/docs/superpowers/specs/2026-11-20-whatsapp-sales-tracker-design.md)

## Global Constraints

- **Platform Runtime:** Backend must run within Koyeb's 512MB RAM and 0.1 vCPU limits without memory leaks or crash loops.
- **WhatsApp Web Compatibility:** Multi-device Noise protocol via Baileys; no unofficial browser automation (no Puppeteer/Playwright) to minimize RAM and eliminate WhatsApp ban risk.
- **Client OS Compatibility:** Frontend must function cleanly on Chromium 109+ / Firefox ESR on Windows 7 32-bit as well as mobile viewports.
- **Zero Cost Envelope:** Stored data must stay within Supabase's 500MB free database storage; media binaries are never persisted.
- **Personal Number Isolation:** Group chats (`@g.us`) are strictly ignored; 1-on-1 chats default to `is_customer = false` until explicitly qualified to prevent personal chats from polluting the sales pipeline.

## Review Focus

1. **Baileys Session Persistence on Koyeb Restart:** If Koyeb restarts or redeploys, does Baileys restore auth credentials from Supabase without forcing the sales rep to rescan the QR code?
2. **Memory Leaks from Message Ingestion:** If an active WhatsApp account receives hundreds of messages, does the backend stream events without holding unneeded message trees in RAM?
3. **Personal Chat Isolation:** Does an incoming chat from a personal contact or family group stay out of the sales pipeline and avoid triggering false `Belum Dibalas` alarms?
4. **Offline / Disconnect Reconnection:** If the user's phone temporarily loses internet, does the backend reconnect gracefully and update the frontend status?
5. **Dashboard Access Security:** Does the dashboard prevent unauthenticated public internet visitors on the Cloudflare Pages URL from seeing contact details and chat snippets?

---

## File Structure

```
d:/wispr-clone/
├── supabase/
│   └── migrations/
│       └── 20261120000000_init_schema.sql
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── src/
│   │   ├── config.ts
│   │   ├── db/
│   │   │   ├── supabase.ts
│   │   │   └── auth-store.ts
│   │   ├── whatsapp/
│   │   │   ├── client.ts
│   │   │   └── status-engine.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── contacts.ts
│   │   │   └── templates.ts
│   │   ├── ws/
│   │   │   └── gateway.ts
│   │   └── index.ts
│   └── tests/
│       ├── auth-store.test.ts
│       ├── status-engine.test.ts
│       └── routes.test.ts
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── types.ts
│   │   ├── api.ts
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   └── useContacts.ts
│   │   ├── components/
│   │   │   ├── PinLockModal.tsx
│   │   │   ├── QrConnectCard.tsx
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── ContactTable.tsx
│   │   │   ├── TriageInbox.tsx
│   │   │   ├── LeadDetailDrawer.tsx
│   │   │   ├── QuickReplyDrawer.tsx
│   │   │   └── HeaderBar.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── tests/
│       ├── status-badge.test.tsx
│       └── triage.test.tsx
```

---

### Task 1: Supabase Database Schema & Setup Scripts

**Files:**
- Create: `supabase/migrations/20261120000000_init_schema.sql`
- Create: `server/src/db/supabase.ts`
- Create: `server/tests/schema-validation.test.ts`

**Interfaces:**
- Produces: `supabaseClient` typed with database tables (`baileys_auth_store`, `contacts`, `follow_up_reminders`, `quick_replies`).

- [ ] **Step 1: Write SQL migration file**
  Implement `supabase/migrations/20261120000000_init_schema.sql` containing tables:
  - `baileys_auth_store` (`id` TEXT PK, `session_data` JSONB, `updated_at` TIMESTAMPTZ)
  - `contacts` (`jid` TEXT PK, `phone_number` TEXT, `name` TEXT, `push_name` TEXT, `is_customer` BOOLEAN DEFAULT FALSE, `is_group` BOOLEAN DEFAULT FALSE, `pipeline_stage` TEXT DEFAULT 'lead_baru', `temperature` TEXT DEFAULT 'warm', `tags` TEXT[] DEFAULT '{}', `internal_notes` TEXT DEFAULT '', `last_message_text` TEXT, `last_message_at` TIMESTAMPTZ, `last_sender_is_me` BOOLEAN, `updated_at` TIMESTAMPTZ)
  - `follow_up_reminders` (`id` UUID PK, `contact_jid` TEXT REFERENCES contacts, `scheduled_at` TIMESTAMPTZ, `note` TEXT, `is_completed` BOOLEAN DEFAULT FALSE)
  - `quick_replies` (`id` UUID PK, `title` TEXT, `template_text` TEXT, `category` TEXT)

- [ ] **Step 2: Create Supabase client wrapper**
  In `server/src/db/supabase.ts`, instantiate `@supabase/supabase-js` client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 3: Write test to verify schema definition & types**
  In `server/tests/schema-validation.test.ts`, write unit tests asserting that table names and required columns match the design specification.

- [ ] **Step 4: Run tests**
  Run: `cd server && npm test tests/schema-validation.test.ts`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add supabase/ server/src/db/ server/tests/
  git commit -m "feat(db): add initial Supabase migration and typed client"
  ```

---

### Task 2: Baileys Persistent Authentication Store for Supabase

**Files:**
- Create: `server/src/db/auth-store.ts`
- Test: `server/tests/auth-store.test.ts`

**Interfaces:**
- Consumes: `supabaseClient` from `server/src/db/supabase.ts`
- Produces: `useSupabaseAuthState(supabase: SupabaseClient): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }>`

- [ ] **Step 1: Write failing test for Supabase Auth State Adapter**
  In `server/tests/auth-store.test.ts`, write a test that mocks Supabase `select` and `upsert` and asserts that Baileys `creds` and signal keys can be saved and reloaded accurately.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd server && npm test tests/auth-store.test.ts`  
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement `useSupabaseAuthState` in `server/src/db/auth-store.ts`**
  Implement custom Baileys authentication state:
  - Loads credentials from `baileys_auth_store` where `id = 'creds'`.
  - Serializes and deserializes signal keys (`pre-key`, `session`, `sender-key`, etc.) via `BufferJSON`.
  - Implements `keys.set` and `saveCreds` by upserting changed keys into Supabase.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd server && npm test tests/auth-store.test.ts`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add server/src/db/auth-store.ts server/tests/auth-store.test.ts
  git commit -m "feat(wa): implement persistent Baileys auth state on Supabase"
  ```

---

### Task 3: WhatsApp Client & Conversational SLA Detection Engine

**Files:**
- Create: `server/src/whatsapp/status-engine.ts`
- Create: `server/src/whatsapp/client.ts`
- Test: `server/tests/status-engine.test.ts`

**Interfaces:**
- Consumes: `useSupabaseAuthState` from Task 2
- Produces:
  - `computeSlaStatus(lastMessageAt: Date | null, lastSenderIsMe: boolean, now?: Date): 'belum_dibalas' | 'perlu_followup' | 'menunggu_respon' | 'idle'`
  - `initWhatsApp(callbacks: WhatsAppEventCallbacks): Promise<WASocket>`

- [ ] **Step 1: Write failing unit tests for SLA status detection**
  In `server/tests/status-engine.test.ts`:
  - Test: Customer sent message 3 hours ago, no reply $\rightarrow$ returns `'belum_dibalas'`.
  - Test: Customer sent message 30 mins ago $\rightarrow$ returns `'menunggu_respon'`.
  - Test: Sales sent message 4 days ago, no reply $\rightarrow$ returns `'perlu_followup'`.
  - Test: Sales sent message 1 day ago $\rightarrow$ returns `'menunggu_respon'`.

- [ ] **Step 2: Run test to verify failure**
  Run: `cd server && npm test tests/status-engine.test.ts`  
  Expected: FAIL

- [ ] **Step 3: Implement SLA logic and Baileys client wrapper**
  - Implement `computeSlaStatus` in `server/src/whatsapp/status-engine.ts`.
  - In `server/src/whatsapp/client.ts`, configure `makeWASocket` with:
    - `syncFullHistory: false` (memory-safe).
    - Event listener for `connection.update` (emits QR data or connection status).
    - Event listener for `messages.upsert`:
      - Ignores messages from `@g.us` (groups).
      - Extracts sender phone number, contact name, text snippet, and timestamp.
      - Upserts into `contacts` table (updating `last_message_text`, `last_message_at`, `last_sender_is_me`).
      - Emits socket event to frontend.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd server && npm test tests/status-engine.test.ts`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add server/src/whatsapp/ server/tests/status-engine.test.ts
  git commit -m "feat(wa): implement Baileys event listener and SLA calculation engine"
  ```

---

### Task 4: Backend REST API & Real-Time WebSocket Gateway

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/src/routes/contacts.ts`
- Create: `server/src/routes/templates.ts`
- Create: `server/src/ws/gateway.ts`
- Create: `server/src/index.ts`
- Test: `server/tests/routes.test.ts`

**Interfaces:**
- Produces: Express REST API & WebSocket server on `PORT` (default 3000):
  - `GET /api/status` (Connection state & QR code string)
  - `GET /api/contacts` (Query with filters `is_customer`, `pipeline_stage`, `search`)
  - `PATCH /api/contacts/:jid` (Update `is_customer`, `pipeline_stage`, `temperature`, `tags`, `internal_notes`)
  - `GET /api/templates`, `POST /api/templates`
  - `GET /api/reminders`, `POST /api/reminders`
  - WebSocket `/ws` emitting `status_changed`, `qr_generated`, `contact_updated`

- [ ] **Step 1: Write failing tests for REST endpoints**
  In `server/tests/routes.test.ts`, write supertest suites verifying:
  - Auth protection with Master PIN header (`x-app-pin`).
  - Contact update route (`PATCH /api/contacts/:jid`) correctly updates `is_customer` and `pipeline_stage`.
  - Templates CRUD operations.

- [ ] **Step 2: Run test to verify failure**
  Run: `cd server && npm test tests/routes.test.ts`  
  Expected: FAIL

- [ ] **Step 3: Implement routes, PIN middleware, and WebSocket server**
  Implement route handlers and wire up WebSocket broadcast in `server/src/ws/gateway.ts`. Assemble Express app and HTTP server in `server/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd server && npm test tests/routes.test.ts`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add server/src/routes/ server/src/ws/ server/src/index.ts server/tests/routes.test.ts
  git commit -m "feat(api): create Express REST API and WebSocket gateway"
  ```

---

### Task 5: Frontend Scaffolding, Types & State Management

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/src/types.ts`
- Create: `client/src/api.ts`
- Create: `client/src/hooks/useSocket.ts`
- Create: `client/src/hooks/useContacts.ts`

**Interfaces:**
- Produces:
  - `Contact`, `SlaStatus`, `PipelineStage`, `Reminder`, `QuickReply` TypeScript interfaces.
  - `fetchContacts()`, `updateContact()`, `fetchTemplates()`, `fetchReminders()` API client.
  - `useSocket()` hook maintaining real-time updates and QR code state.

- [ ] **Step 1: Initialize Vite React app configuration & types**
  Configure `client/vite.config.ts` with React & Tailwind CSS. Define comprehensive TypeScript definitions in `client/src/types.ts`.

- [ ] **Step 2: Implement API client with PIN auth token injection**
  In `client/src/api.ts`, create `ky` or `fetch` wrapper attaching `x-app-pin` stored in `localStorage`.

- [ ] **Step 3: Implement `useSocket` and `useContacts` hooks**
  In `client/src/hooks/useSocket.ts`, handle WebSocket reconnects, QR code stream, and message update events. In `useContacts.ts`, manage contact list caching and optimistic updates.

- [ ] **Step 4: Verify build succeeds**
  Run: `cd client && npm run build`  
  Expected: Build succeeds without TypeScript errors.

- [ ] **Step 5: Commit**
  ```bash
  git add client/
  git commit -m "feat(client): scaffold Vite React client, types, and data hooks"
  ```

---

### Task 6: Frontend QR Scanner & Connection Onboarding Card

**Files:**
- Create: `client/src/components/QrConnectCard.tsx`
- Create: `client/src/components/PinLockModal.tsx`
- Test: `client/tests/qr-connect.test.tsx`

**Interfaces:**
- Consumes: `useSocket` from Task 5
- Produces:
  - `<QrConnectCard connectionState={state} qrCode={qrCode} onDisconnect={...} />`
  - `<PinLockModal onUnlock={...} />`

- [ ] **Step 1: Write unit test for QR display and PIN lock modal**
  In `client/tests/qr-connect.test.tsx`, test that:
  - When connection is `disconnected`, the QR canvas renders.
  - When connection is `connected`, the card displays phone number and green checkmark.
  - When no PIN is in `localStorage`, the `<PinLockModal />` renders.

- [ ] **Step 2: Run test to verify failure**
  Run: `cd client && npm test tests/qr-connect.test.tsx`  
  Expected: FAIL

- [ ] **Step 3: Implement QrConnectCard and PinLockModal**
  Use `qrcode.react` to render the WhatsApp QR code with instructions: *"Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat"*.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd client && npm test tests/qr-connect.test.tsx`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add client/src/components/QrConnectCard.tsx client/src/components/PinLockModal.tsx client/tests/qr-connect.test.tsx
  git commit -m "feat(ui): add QR code onboarding and PIN unlock components"
  ```

---

### Task 7: Frontend Triage Inbox (Personal vs. Customer Qualification)

**Files:**
- Create: `client/src/components/TriageInbox.tsx`
- Test: `client/tests/triage.test.tsx`

**Interfaces:**
- Consumes: `Contact` list where `is_customer === false`
- Produces: `<TriageInbox contacts={contacts} onPromote={...} onIgnore={...} />`

- [ ] **Step 1: Write test for contact triage actions**
  In `client/tests/triage.test.tsx`, test that clicking `[+ Jadikan Pelanggan]` calls `updateContact(jid, { is_customer: true })` and removes the contact from the triage queue.

- [ ] **Step 2: Run test to verify failure**
  Run: `cd client && npm test tests/triage.test.tsx`  
  Expected: FAIL

- [ ] **Step 3: Implement `TriageInbox.tsx` component**
  Display a clean queue of new 1-on-1 chats:
  - Contact phone number and push name.
  - Last message preview and timestamp.
  - Actions: **`[+ Jadikan Pelanggan]`** (promotes to pipeline) and **`[Abaikan]`** (keeps out of pipeline).

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd client && npm test tests/triage.test.tsx`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add client/src/components/TriageInbox.tsx client/tests/triage.test.tsx
  git commit -m "feat(ui): add Triage Inbox for qualifying personal vs customer chats"
  ```

---

### Task 8: Frontend Sales Kanban Board & Tabular View

**Files:**
- Create: `client/src/components/KanbanBoard.tsx`
- Create: `client/src/components/ContactTable.tsx`
- Create: `client/src/components/HeaderBar.tsx`
- Test: `client/tests/kanban.test.tsx`

**Interfaces:**
- Consumes: `contacts` where `is_customer === true`
- Produces:
  - `<KanbanBoard contacts={customers} onMoveStage={...} onSelect={...} />`
  - `<ContactTable contacts={customers} onSelect={...} />`

- [ ] **Step 1: Write unit tests for Kanban cards and SLA badges**
  In `client/tests/kanban.test.tsx`, assert that:
  - Contacts with SLA `'belum_dibalas'` display the red alert badge `[!] Belum Dibalas`.
  - Contacts with SLA `'perlu_followup'` display the orange warning badge `[~] Perlu Follow-up`.
  - Privacy masking blurs sensitive text when enabled.

- [ ] **Step 2: Run test to verify failure**
  Run: `cd client && npm test tests/kanban.test.tsx`  
  Expected: FAIL

- [ ] **Step 3: Implement Kanban, Table, and HeaderBar**
  - Implement 4 Kanban columns: *Lead Baru*, *Sedang Diskusi*, *Closing*, *Lost*.
  - Render cards with lead temperature icon (🔥/⚡/❄️), tags, last interaction time, and action badge.
  - Implement `<HeaderBar />` with stats counters (e.g. `3 Belum Dibalas`, `5 Perlu Follow-up`), search bar, Privacy Mode toggle, and View Mode switcher (Kanban / Table / Triage).

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd client && npm test tests/kanban.test.tsx`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add client/src/components/KanbanBoard.tsx client/src/components/ContactTable.tsx client/src/components/HeaderBar.tsx client/tests/kanban.test.tsx
  git commit -m "feat(ui): implement Sales Kanban board, list view, and header status bar"
  ```

---

### Task 9: Frontend Lead Detail Drawer & Quick Reply Drawer

**Files:**
- Create: `client/src/components/LeadDetailDrawer.tsx`
- Create: `client/src/components/QuickReplyDrawer.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/lead-drawer.test.tsx`

**Interfaces:**
- Consumes: Selected `contact`, `templates` list
- Produces:
  - `<LeadDetailDrawer contact={selectedContact} onClose={...} onSaveNotes={...} onAddReminder={...} />`
  - `<QuickReplyDrawer templates={templates} contact={selectedContact} onClose={...} />`

- [ ] **Step 1: Write unit tests for drawer interactions**
  In `client/tests/lead-drawer.test.tsx`, verify:
  - Updating internal notes calls `updateContact()`.
  - Clicking a template formats the message with contact name and generates `wa.me` deep link.

- [ ] **Step 2: Run test to verify failure**
  Run: `cd client && npm test tests/lead-drawer.test.tsx`  
  Expected: FAIL

- [ ] **Step 3: Implement Drawers and integrate into `App.tsx`**
  - Implement slide-over modal for Lead Detail (temperature selector, custom tag pills, markdown notes, follow-up scheduler).
  - Implement Quick Reply drawer with search, 1-click clipboard copy, and direct WhatsApp open.
  - Connect all components in `client/src/App.tsx`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd client && npm test tests/lead-drawer.test.tsx`  
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add client/src/components/LeadDetailDrawer.tsx client/src/components/QuickReplyDrawer.tsx client/src/App.tsx client/tests/lead-drawer.test.tsx
  git commit -m "feat(ui): integrate Lead Detail drawer and Quick Reply templates"
  ```

---

### Task 10: Production Deployment Config (Koyeb & Cloudflare Pages)

**Files:**
- Create: `server/Dockerfile`
- Create: `server/koyeb.yaml`
- Create: `client/_routes.json`
- Create: `docs/DEPLOYMENT_GUIDE.md`

**Interfaces:**
- Produces: Fully containerized backend for Koyeb and static build configuration for Cloudflare Pages with zero-cost setup instructions.

- [ ] **Step 1: Write production Dockerfile for Koyeb**
  Create multi-stage `server/Dockerfile` (node:20-alpine) that builds TypeScript and runs the production server with lightweight memory footprint.

- [ ] **Step 2: Create Koyeb service definition**
  In `server/koyeb.yaml`, define single instance configuration matching Hobby Free tier (`instance_type: nano`, 512MB RAM).

- [ ] **Step 3: Configure Cloudflare Pages routing**
  In `client/_routes.json`, configure Single Page Application routing rules.

- [ ] **Step 4: Create step-by-step free deployment documentation**
  Write `docs/DEPLOYMENT_GUIDE.md` detailing:
  1. How to run Supabase SQL migration.
  2. How to deploy `server/` to Koyeb (connecting Supabase credentials).
  3. How to connect GitHub repo to Cloudflare Pages for instant automatic build.

- [ ] **Step 5: Commit**
  ```bash
  git add server/Dockerfile server/koyeb.yaml client/_routes.json docs/DEPLOYMENT_GUIDE.md
  git commit -m "docs(deploy): add Dockerfile, Koyeb config, and zero-cost deployment guide"
  ```
