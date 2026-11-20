# Panduan Deployment Gratis: WhatsApp Sales Tracker

Aplikasi ini dirancang untuk dapat berjalan **100% gratis selamanya** menggunakan kombinasi **Supabase + Koyeb + Cloudflare Pages**.

---

### Langkah 1: Setup Database Supabase (Gratis)

1. Buka [Supabase](https://supabase.com) dan buat akun gratis.
2. Buat proyek baru (*New Project*). Beri nama (misal: `wa-sales-tracker`) dan tentukan password database.
3. Setelah proyek siap, buka menu **SQL Editor** di sidebar kiri.
4. Salin seluruh isi file SQL berikut:
   📄 [`supabase/migrations/20261120000000_init_schema.sql`](file:///d:/wispr-clone/supabase/migrations/20261120000000_init_schema.sql)
5. Tempelkan ke SQL Editor lalu klik tombol **Run** (Ctrl + Enter).
   *Seluruh tabel (`baileys_auth_store`, `contacts`, `follow_up_reminders`, `quick_replies`) dan data template bawaan akan terbuat otomatis.*
6. Buka menu **Project Settings** (ikon gerigi di pojok bawah) $\rightarrow$ **API**:
   * Catat **Project URL** (misal: `https://abcdefg.supabase.co`).
   * Catat **`service_role` secret key** (klik *reveal* untuk melihat kuncinya).

---

### Langkah 2: Deploy Backend ke Koyeb (Gratis)

1. Pastikan kode aplikasi ini sudah di-*push* ke repository GitHub Anda (bisa public atau private).
2. Buka [Koyeb](https://www.koyeb.com) dan daftar akun gratis.
3. Di dashboard Koyeb, klik **Create Service** $\rightarrow$ pilih **GitHub**.
4. Hubungkan akun GitHub Anda dan pilih repository project ini.
5. Konfigurasi Deployment:
   * **Root Directory:** ketik `server`
   * **Build & Deployment:** pilih *Dockerfile* (Koyeb akan otomatis membaca `server/Dockerfile`).
   * **Instance Type:** pilih **Nano** (Gratis, 512 MB RAM, 0.1 vCPU).
   * **Regions:** pilih *Frankfurt (fra)* atau *Washington (was)*.
6. Masukkan **Environment Variables**:
   * `SUPABASE_URL` = (Project URL dari Supabase Langkah 1)
   * `SUPABASE_SERVICE_ROLE_KEY` = (service_role secret key dari Supabase Langkah 1)
   * `APP_PIN` = Tentukan PIN angka rahasia Anda (misal: `123456`) untuk mengunci aplikasi.
7. Klik **Deploy**.
8. Setelah statusnya *Healthy*, Anda akan mendapatkan URL backend publik HTTPS (misal: `https://wa-tracker-xxxx.koyeb.app`).

---

### Langkah 3: Deploy Frontend ke Cloudflare Pages (Gratis)

1. Buka dashboard [Cloudflare](https://dash.cloudflare.com).
2. Masuk ke menu **Workers & Pages** $\rightarrow$ klik **Create application** $\rightarrow$ tab **Pages** $\rightarrow$ **Connect to Git**.
3. Pilih repository GitHub Anda.
4. Pada form **Build settings**:
   * **Framework preset:** `Vite`
   * **Root directory:** `client`
   * **Build command:** `npm run build`
   * **Build output directory:** `dist`
5. Pada bagian **Environment variables (production)**, tambahkan:
   * `VITE_API_URL` = URL backend Koyeb Anda (dari Langkah 2).
6. Klik **Save and Deploy**.
7. Dalam 1 menit, website Anda sudah aktif dengan URL Cloudflare Pages gratis (misal: `https://wa-sales-tracker.pages.dev`).

---

### Cara Menggunakan Aplikasi:

1. Buka URL Cloudflare Pages Anda di browser komputer (Windows 7 / 10 / 11) atau browser HP.
2. Masukkan **Master PIN** yang telah Anda tentukan.
3. Pindai kode QR yang muncul menggunakan WhatsApp di HP Anda (*Buka WhatsApp $\rightarrow$ Perangkat Tertaut $\rightarrow$ Tautkan Perangkat*).
4. Status akan berubah menjadi **WhatsApp Terhubung**.
5. Buka tab **Triage** untuk memilih chat mana yang merupakan pelanggan Anda dengan klik **`+ Jadikan Pelanggan`**.
6. Pantau alur negosiasi dan pengingat waktu respon langsung di **Papan Kanban**!
