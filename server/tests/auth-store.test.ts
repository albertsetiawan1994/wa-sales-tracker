import { describe, it, expect, vi } from 'vitest';

describe('Task 2: Supabase Baileys Auth Store Adapter', () => {
  it('useSupabaseAuthState loads credentials and manages keys in supabase', async () => {
    const { useSupabaseAuthState } = await import('../src/db/auth-store.js');

    const mockStorage: Record<string, any> = {};

    const mockSupabase = {
      from: (table: string) => {
        expect(table).toBe('baileys_auth_store');
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              single: async () => {
                if (mockStorage[val]) {
                  return { data: { id: val, session_data: mockStorage[val] }, error: null };
                }
                return { data: null, error: { message: 'Not found' } };
              },
            }),
          }),
          upsert: async (records: any) => {
            const arr = Array.isArray(records) ? records : [records];
            for (const r of arr) {
              mockStorage[r.id] = r.session_data;
            }
            return { error: null };
          },
          delete: () => ({
            in: async (_col: string, ids: string[]) => {
              for (const id of ids) {
                delete mockStorage[id];
              }
              return { error: null };
            },
          }),
        };
      },
    };

    const { state, saveCreds } = await useSupabaseAuthState(mockSupabase as any);

    expect(state).toBeDefined();
    expect(state.creds).toBeDefined();
    expect(typeof saveCreds).toBe('function');

    // Test saving credentials
    await saveCreds();
    expect(mockStorage['creds']).toBeDefined();

    // Test writing keys
    await state.keys.set({
      'app-state-sync-key': {
        testKey1: { keyData: Buffer.from('test-data') },
      },
    });

    const loadedKeys = await state.keys.get('app-state-sync-key', ['testKey1']);
    expect(loadedKeys['testKey1']).toBeDefined();
    expect(Buffer.isBuffer(loadedKeys['testKey1'].keyData)).toBe(true);
  });
});
