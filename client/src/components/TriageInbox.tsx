import React, { useState } from 'react';
import { UserCheck, UserX, Inbox, MessageSquare, Phone, Search, CheckCircle2 } from 'lucide-react';
import { Contact } from '../types.js';

interface TriageInboxProps {
  contacts: Contact[];
  onPromote: (jid: string) => Promise<void>;
  onIgnore: (jid: string) => Promise<void>;
  isMasked?: boolean;
}

export function TriageInbox({ contacts, onPromote, onIgnore, isMasked }: TriageInboxProps) {
  const [search, setSearch] = useState('');
  const [processingJid, setProcessingJid] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(s)) ||
      (c.push_name && c.push_name.toLowerCase().includes(s)) ||
      c.phone_number.includes(s) ||
      (c.last_message_text && c.last_message_text.toLowerCase().includes(s))
    );
  });

  const handlePromote = async (jid: string) => {
    try {
      setProcessingJid(jid);
      await onPromote(jid);
    } finally {
      setProcessingJid(null);
    }
  };

  const handleIgnore = async (jid: string) => {
    try {
      setProcessingJid(jid);
      await onIgnore(jid);
    } finally {
      setProcessingJid(null);
    }
  };

  const maskString = (str: string) => {
    if (!isMasked || !str) return str;
    return str.substring(0, 3) + '••••' + str.slice(-2);
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Kotak Masuk Triage (Chat Pribadi / Baru)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {filtered.length} Perlu Ditinjau
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pisahkan chat pelanggan bisnis dari kontak keluarga/teman pribadi dengan 1 klik.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/40" />
          <p className="text-sm font-semibold text-slate-300">Semua chat telah ditinjau!</p>
          <p className="text-xs text-slate-500 mt-1">
            Tidak ada pesan baru yang belum dikategorikan. Chat pelanggan aktif dapat dipantau di Papan Kanban.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {filtered.map((contact) => (
            <div
              key={contact.jid}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-700/20 px-3 rounded-xl transition"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {(contact.name || contact.push_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">
                      {isMasked ? maskString(contact.name || contact.push_name || 'Kontak') : (contact.name || contact.push_name || 'Tanpa Nama')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      +{isMasked ? maskString(contact.phone_number) : contact.phone_number}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 max-w-xl">
                    <MessageSquare className="w-3 h-3 inline mr-1 text-slate-400" />
                    {isMasked ? '••••••••••••••••' : (contact.last_message_text || 'Tidak ada teks pesan')}
                  </p>

                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {contact.last_message_at
                      ? `Terakhir interaksi: ${new Date(contact.last_message_at).toLocaleString('id-ID')}`
                      : 'Belum ada interaksi'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  disabled={processingJid === contact.jid}
                  onClick={() => handlePromote(contact.jid)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  + Jadikan Pelanggan
                </button>
                <button
                  disabled={processingJid === contact.jid}
                  onClick={() => handleIgnore(contact.jid)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Abaikan (Pribadi)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
