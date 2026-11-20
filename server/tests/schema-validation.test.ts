import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 1: Supabase Schema Migration Validation', () => {
  const sqlPath = path.resolve(__dirname, '../../supabase/migrations/20261120000000_init_schema.sql');

  it('migration file exists and contains all required tables and indexes', () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // 1. baileys_auth_store
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS baileys_auth_store');
    expect(sqlContent).toContain('session_data JSONB NOT NULL');

    // 2. contacts
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS contacts');
    expect(sqlContent).toContain('is_customer BOOLEAN DEFAULT FALSE');
    expect(sqlContent).toContain('pipeline_stage TEXT DEFAULT \'lead_baru\'');
    expect(sqlContent).toContain('temperature TEXT DEFAULT \'warm\'');
    expect(sqlContent).toContain('tags TEXT[] DEFAULT \'{}\'');
    expect(sqlContent).toContain('internal_notes TEXT DEFAULT \'\'');
    expect(sqlContent).toContain('last_message_at TIMESTAMP WITH TIME ZONE');
    expect(sqlContent).toContain('last_sender_is_me BOOLEAN DEFAULT FALSE');

    // 3. follow_up_reminders
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS follow_up_reminders');
    expect(sqlContent).toContain('scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL');

    // 4. quick_replies
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS quick_replies');
  });

  it('supabase client module exports a typed client instance and interfaces', async () => {
    // This will fail until server/src/db/supabase.ts is created
    const mod = await import('../src/db/supabase.js');
    expect(mod.getSupabaseClient).toBeDefined();
    expect(typeof mod.getSupabaseClient).toBe('function');
  });
});
