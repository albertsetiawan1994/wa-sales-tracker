import { useState, useEffect, useCallback } from 'react';
import { Contact } from '../types.js';
import { fetchContacts, updateContact as apiUpdateContact } from '../api.js';

export function useContacts(isCustomer: boolean) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContacts({ is_customer: isCustomer });
      setContacts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    load();
  }, [load]);

  const updateContactOptimistic = async (jid: string, updates: Partial<Contact>) => {
    setContacts((prev) =>
      prev.map((c) => (c.jid === jid ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
    );

    try {
      const updated = await apiUpdateContact(jid, updates);
      setContacts((prev) => prev.map((c) => (c.jid === jid ? updated : c)));
      return updated;
    } catch (err) {
      load();
      throw err;
    }
  };

  const handleSocketContactUpdate = (updatedContact: Contact) => {
    setContacts((prev) => {
      const exists = prev.some((c) => c.jid === updatedContact.jid);
      if (exists) {
        if (updatedContact.is_customer !== isCustomer) {
          return prev.filter((c) => c.jid !== updatedContact.jid);
        }
        return prev.map((c) => (c.jid === updatedContact.jid ? updatedContact : c));
      } else if (updatedContact.is_customer === isCustomer) {
        return [updatedContact, ...prev];
      }
      return prev;
    });
  };

  return {
    contacts,
    loading,
    error,
    refresh: load,
    updateContact: updateContactOptimistic,
    handleSocketContactUpdate,
  };
}
