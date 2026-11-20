import React, { useState, useEffect } from 'react';
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
import { fetchQuickReplies, createQuickReply, createReminder, getStoredPin } from './api.js';
import { Contact, QuickReply, PipelineStage } from './types.js';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
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
    loading: loadingCustomers,
    error: customerError,
    refresh: refreshCustomers,
    updateContact: updateCustomer,
    handleSocketContactUpdate: handleCustomerSocketUpdate,
  } = useContacts(true);

  // Triage contacts (is_customer === false)
  const {
    contacts: triageContacts,
    loading: loadingTriage,
    refresh: refreshTriage,
    updateContact: updateTriage,
    handleSocketContactUpdate: handleTriageSocketUpdate,
  } = useContacts(false);

  // Real-time WebSocket connection
  const { connectionState } = useSocket({
    onContactUpdated: (contact) => {
      handleCustomerSocketUpdate(contact);
      handleTriageSocketUpdate(contact);
    },
    onMessageReceived: () => {
      refreshCustomers();
      refreshTriage();
    },
  });

  // Check initial PIN
  useEffect(() => {
    if (getStoredPin()) {
      setIsUnlocked(true);
    }
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

  // Ignore / hide contact in Triage
  const handleIgnoreContact = async (jid: string) => {
    await updateTriage(jid, { is_customer: false, pipeline_stage: 'lost' });
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

  if (!isUnlocked) {
    return <PinLockModal onUnlock={() => setIsUnlocked(true)} error={customerError} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <HeaderBar
        contacts={customers}
        triageCount={triageContacts.length}
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
          onRefresh={() => {
            refreshCustomers();
            refreshTriage();
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
            isMasked={isMasked}
          />
        )}
      </main>

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onUpdate={handleUpdateContactDetails}
        onAddReminder={handleAddReminder}
        isMasked={isMasked}
      />

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
