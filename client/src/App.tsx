import { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { useContacts } from './hooks/useContacts.js';
import { HeaderBar } from './components/HeaderBar.js';
import { QrConnectCard } from './components/QrConnectCard.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { ContactTable } from './components/ContactTable.js';
import { TriageInbox } from './components/TriageInbox.js';
import { LeadDetailDrawer } from './components/LeadDetailDrawer.js';
import { QuickReplyDrawer } from './components/QuickReplyDrawer.js';
import { PinLockModal } from './components/PinLockModal.js';
import {
  fetchQuickReplies,
  createQuickReply,
  createReminder,
  getStoredPin,
  fetchConnectionStatus,
  triggerReconnect,
  logoutWhatsAppSession,
} from './api.js';
import { Contact, QuickReply, PipelineStage } from './types.js';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'kanban' | 'table' | 'triage'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMasked, setIsMasked] = useState(false);

  // Selected lead for drawer
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [templates, setTemplates] = useState<QuickReply[]>([]);

  // Customer contacts
  const {
    contacts: customers,
    error: customerError,
    refresh: refreshCustomers,
    updateContact: updateCustomer,
    handleSocketContactUpdate: handleCustomerSocketUpdate,
  } = useContacts(true);

  // Triage contacts (is_customer === false)
  const {
    contacts: triageContacts,
    refresh: refreshTriage,
    updateContact: updateTriage,
    handleSocketContactUpdate: handleTriageSocketUpdate,
  } = useContacts(false);

  // Debounced message received handler to prevent refetch storms
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time WebSocket connection
  const { connectionState, setConnectionState } = useSocket({
    isUnlocked,
    onContactUpdated: (contact) => {
      handleCustomerSocketUpdate(contact);
      handleTriageSocketUpdate(contact);
    },
    onMessageReceived: () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        refreshCustomers();
        refreshTriage();
      }, 500);
    },
  });

  // Polling fallback: while not connected, query /api/status every 3.5s
  useEffect(() => {
    if (connectionState.status === 'connected') return;

    let isMounted = true;
    const pollStatus = async () => {
      try {
        const state = await fetchConnectionStatus();
        if (isMounted) {
          setConnectionState((prev) => {
            if (
              prev.status !== state.status ||
              prev.qrCode !== state.qrCode ||
              prev.userPhone !== state.userPhone ||
              prev.lastError?.message !== state.lastError?.message
            ) {
              return state;
            }
            return prev;
          });
        }
      } catch {
        // Silently ignore polling network errors
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [connectionState.status, setConnectionState]);

  // Check initial PIN and listen for auth error events
  useEffect(() => {
    if (getStoredPin()) {
      setIsUnlocked(true);
    }

    const handleAuthRequired = (e: any) => {
      setIsUnlocked(false);
      setAuthError(e.detail || 'PIN salah atau sesi kedaluwarsa');
    };

    window.addEventListener('auth_required', handleAuthRequired);
    return () => window.removeEventListener('auth_required', handleAuthRequired);
  }, []);

  // Fetch quick reply templates
  useEffect(() => {
    if (isUnlocked) {
      fetchQuickReplies()
        .then(setTemplates)
        .catch(() => {});
    }
  }, [isUnlocked]);

  // Promote contact from Triage to Customer
  const handlePromoteContact = async (jid: string) => {
    await updateTriage(jid, { is_customer: true, pipeline_stage: 'lead_baru' });
    refreshCustomers();
    refreshTriage();
  };

  // Ignore / hide contact in Triage (sets stage to 'lost' to remove from queue)
  const handleIgnoreContact = async (jid: string) => {
    await updateTriage(jid, { is_customer: false, pipeline_stage: 'lost' });
    refreshTriage();
  };

  // Restore ignored contact back to active Triage queue
  const handleRestoreContact = async (jid: string) => {
    await updateTriage(jid, { is_customer: false, pipeline_stage: 'lead_baru' });
    refreshTriage();
  };

  // Move stage in Kanban
  const handleMoveStage = async (jid: string, newStage: PipelineStage) => {
    await updateCustomer(jid, { pipeline_stage: newStage });
  };

  // Update contact details from drawer
  const handleUpdateContactDetails = async (jid: string, updates: Partial<Contact>) => {
    const updated = await updateCustomer(jid, updates);
    setSelectedContact(updated);
  };

  // Add reminder
  const handleAddReminder = async (data: { contact_jid: string; scheduled_at: string; note: string }) => {
    await createReminder(data);
    alert('Pengingat jadwal follow-up berhasil disimpan!');
  };

  // Create quick reply template
  const handleCreateTemplate = async (tmpl: { title: string; template_text: string; category?: string }) => {
    const created = await createQuickReply(tmpl);
    setTemplates((prev) => [...prev, created]);
  };

  // Filter customers by search
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(s)) ||
      (c.push_name && c.push_name.toLowerCase().includes(s)) ||
      c.phone_number.includes(s) ||
      (c.tags && c.tags.some((t) => t.toLowerCase().includes(s)))
    );
  });

  const activeTriageCount = triageContacts.filter((c) => c.pipeline_stage !== 'lost').length;

  if (!isUnlocked) {
    return (
      <PinLockModal
        onUnlock={() => {
          setIsUnlocked(true);
          setAuthError(null);
          refreshCustomers();
          refreshTriage();
        }}
        error={authError || customerError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <HeaderBar
        contacts={customers}
        triageCount={activeTriageCount}
        currentView={currentView}
        onViewChange={setCurrentView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isMasked={isMasked}
        onToggleMask={() => setIsMasked((prev) => !prev)}
        onOpenQuickReplies={() => setIsQuickRepliesOpen(true)}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto space-y-6">
        {/* WhatsApp QR / Connection Status Banner */}
        <QrConnectCard
          connectionState={connectionState}
          onRefresh={async () => {
            await triggerReconnect();
            try {
              const state = await fetchConnectionStatus();
              setConnectionState(state);
            } catch {}
            refreshCustomers();
            refreshTriage();
          }}
          onLogout={async () => {
            await logoutWhatsAppSession();
            setConnectionState({
              status: 'connecting',
              qrCode: null,
              userPhone: null,
            });
            try {
              const state = await fetchConnectionStatus();
              setConnectionState(state);
            } catch {}
          }}
        />

        {/* View switching */}
        {currentView === 'kanban' && (
          <KanbanBoard
            contacts={filteredCustomers}
            onMoveStage={handleMoveStage}
            onSelectContact={(c) => setSelectedContact(c)}
            isMasked={isMasked}
          />
        )}

        {currentView === 'table' && (
          <ContactTable
            contacts={filteredCustomers}
            onSelectContact={(c) => setSelectedContact(c)}
            isMasked={isMasked}
          />
        )}

        {currentView === 'triage' && (
          <TriageInbox
            contacts={triageContacts}
            onPromote={handlePromoteContact}
            onIgnore={handleIgnoreContact}
            onRestore={handleRestoreContact}
            isMasked={isMasked}
          />
        )}
      </main>

      {/* Lead Detail Drawer - keyed by contact JID to prevent stale state */}
      {selectedContact && (
        <LeadDetailDrawer
          key={selectedContact.jid}
          contact={selectedContact}
          templates={templates}
          onClose={() => setSelectedContact(null)}
          onUpdate={handleUpdateContactDetails}
          onAddReminder={handleAddReminder}
          isMasked={isMasked}
        />
      )}

      {/* Quick Reply Drawer */}
      {isQuickRepliesOpen && (
        <QuickReplyDrawer
          templates={templates}
          selectedContact={selectedContact}
          onClose={() => setIsQuickRepliesOpen(false)}
          onCreateTemplate={handleCreateTemplate}
        />
      )}
    </div>
  );
}
