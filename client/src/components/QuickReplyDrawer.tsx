import React, { useState } from 'react';
import { X, Search, Copy, Check, Send, Plus, MessageSquare } from 'lucide-react';
import { QuickReply, Contact } from '../types.js';

interface QuickReplyDrawerProps {
  templates: QuickReply[];
  selectedContact: Contact | null;
  onClose: () => void;
  onCreateTemplate: (template: { title: string; template_text: string; category?: string }) => Promise<void>;
}

export function QuickReplyDrawer({
  templates,
  selectedContact,
  onClose,
  onCreateTemplate,
}: QuickReplyDrawerProps) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New template form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  const customerName = selectedContact?.name || selectedContact?.push_name || 'Kak';

  const formatText = (rawText: string) => {
    return rawText.replace(/\[Nama\]/g, customerName);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(formatText(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;
    await onCreateTemplate({
      title: newTitle.trim(),
      template_text: newText.trim(),
      category: newCategory,
    });
    setNewTitle('');
    setNewText('');
    setShowAddForm(false);
  };

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return t.title.toLowerCase().includes(s) || t.template_text.toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-700/80 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Template Pesan Cepat (Quick Reply)
            </h2>
            <p className="text-xs text-slate-400">
              Kirim atau salin draf respon follow-up personal dengan 1 klik.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Target customer pill */}
          {selectedContact && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between">
              <span>Format otomatis untuk: <b>{customerName}</b></span>
              <span className="font-mono text-[10px]">+{selectedContact.phone_number}</span>
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari template pesan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Templates List */}
          <div className="space-y-3">
            {filtered.map((t) => {
              const formatted = formatText(t.template_text);
              const waUrl = selectedContact
                ? `https://wa.me/${selectedContact.phone_number}?text=${encodeURIComponent(formatted)}`
                : null;

              return (
                <div
                  key={t.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-slate-600 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white text-xs">{t.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                      {t.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 mb-3 whitespace-pre-wrap leading-relaxed">
                    {formatted}
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleCopy(t.id, t.template_text)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      {copiedId === t.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Salin Teks
                        </>
                      )}
                    </button>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Kirim ke WA
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Template Section */}
          <div className="pt-4 border-t border-slate-800">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Tambah Template Baru
              </button>
            ) : (
              <form onSubmit={handleCreate} className="space-y-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <h4 className="text-xs font-bold text-white">Buat Template Baru</h4>
                <input
                  type="text"
                  placeholder="Judul template (cth: Follow-up 3 Hari)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  rows={3}
                  placeholder="Isi pesan (gunakan [Nama] untuk nama pelanggan otomatis)..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
