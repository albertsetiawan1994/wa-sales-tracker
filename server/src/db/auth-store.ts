import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import { SupabaseClient } from '@supabase/supabase-js';

export async function useSupabaseAuthState(
  supabase: SupabaseClient
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const readData = async (id: string): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('baileys_auth_store')
        .select('session_data')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return JSON.parse(JSON.stringify(data.session_data), BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const writeData = async (id: string, sessionData: any): Promise<void> => {
    const serialized = JSON.parse(JSON.stringify(sessionData, BufferJSON.replacer));
    await supabase.from('baileys_auth_store').upsert({
      id,
      session_data: serialized,
      updated_at: new Date().toISOString(),
    });
  };

  const removeData = async (ids: string[]): Promise<void> => {
    await supabase.from('baileys_auth_store').delete().in('id', ids);
  };

  const existingCreds = await readData('creds');
  const creds: AuthenticationCreds = existingCreds || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[]
        ): Promise<{ [key: string]: SignalDataTypeMap[T] }> => {
          const data: { [key: string]: SignalDataTypeMap[T] } = {};
          if (ids.length === 0) return data;

          const keyIds = ids.map((id) => `${type}-${id}`);

          try {
            // Batch read from Supabase in a single query
            const { data: rows } = await supabase
              .from('baileys_auth_store')
              .select('id, session_data')
              .in('id', keyIds);

            if (rows) {
              for (const row of rows) {
                const rawId = row.id.replace(`${type}-`, '');
                data[rawId] = JSON.parse(JSON.stringify(row.session_data), BufferJSON.reviver);
              }
            }
          } catch {
            // Fallback
          }

          return data;
        },
        set: async (data: any): Promise<void> => {
          const rowsToUpsert: { id: string; session_data: any; updated_at: string }[] = [];
          const idsToDelete: string[] = [];

          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const keyId = `${category}-${id}`;
              if (value) {
                const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                rowsToUpsert.push({
                  id: keyId,
                  session_data: serialized,
                  updated_at: new Date().toISOString(),
                });
              } else {
                idsToDelete.push(keyId);
              }
            }
          }

          if (rowsToUpsert.length > 0) {
            await supabase.from('baileys_auth_store').upsert(rowsToUpsert);
          }
          if (idsToDelete.length > 0) {
            await supabase.from('baileys_auth_store').delete().in('id', idsToDelete);
          }
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
  };
}
