import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 1 & Fix: Supabase Schema Migration Validation & URL Sanitization', () => {
  const sqlPath = path.resolve(__dirname, '../../supabase/migrations/20261120000000_init_schema.sql');

  it('migration file exists and contains all required tables and indexes', () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS baileys_auth_store');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS contacts');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS follow_up_reminders');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS quick_replies');
  });

  it('supabase client module exports a typed client instance and sanitizes URL', async () => {
    const { getSupabaseClient, sanitizeSupabaseUrl } = await import('../src/db/supabase.js');
    expect(getSupabaseClient).toBeDefined();
    expect(sanitizeSupabaseUrl('https://xyz.supabase.co/rest/v1/')).toBe('https://xyz.supabase.co');
    expect(sanitizeSupabaseUrl('https://xyz.supabase.co/rest/v1')).toBe('https://xyz.supabase.co');
    expect(sanitizeSupabaseUrl('https://xyz.supabase.co/')).toBe('https://xyz.supabase.co');
    expect(sanitizeSupabaseUrl('https://xyz.supabase.co')).toBe('https://xyz.supabase.co');
  });
});
