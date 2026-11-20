import React, { useState } from 'react';
import {
  X,
  Phone,
  ExternalLink,
  Flame,
  Zap,
  Snowflake,
  Tag,
  Plus,
  Calendar,
  Save,
  MessageSquare,
  FileText,
  Clock,
} from 'lucide-react';
import { Contact, PipelineStage, Temperature } from '../types.js';

interface LeadDetailDrawerProps {
  contact: Contact | null;
  onClose: () => void;
  onUpdate: (jid: string, updates: Partial<Contact>) => Promise<void>;
  onAddReminder: (reminder: { contact_jid: string; scheduled_at: string; note: string }) => Promise<void>;
  isMasked?: boolean;
}

export function LeadDetailDrawer({
  contact,
  onClose,
  onUpdate,
  onAddReminder,
  isMasked,
}: LeadDetailDrawerProps) {
  if (!contact) return null;

  const [notes, setNotes] = useState(contact.internal_notes || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(contact.tags || []);
  const [stage, setStage] = useState<PipelineStage>(contact.pipeline_stage);
  const [temp, setTemp] = useState<Temperature>(contact.temperature);

  // Reminder state
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const maskString = (str: string) => {
    if (!isMasked || !str) return str;
    return str.substring(0, 3) + '••••' + str.slice(-2);
  };

  const handleSaveContactDetails = async () => {
    setIsSaving(true);
    try {
      await onUpdate(contact.jid, {
        internal_notes: notes,
        tags,
        pipeline_stage: stage,
        temperature: temp,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleScheduleReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderDate) return;
    await onAddReminder({
      contact_jid: contact.jid,
      scheduled_at: new Date(reminderDate).toISOString(),
      note: reminderNote,
    });
    setReminderDate('');
    setReminderNote('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-700/80 w-full max-w-md h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <h2 className="text-base font-bold text-white">Detail Prospek Pelanggan</h2>
            <p className="text-xs text-slate-400 font-mono">
              +{isMasked ? maskString(contact.phone_number) : contact.phone_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Contact Identity & WA link */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-sm">
                {isMasked ? maskString(contact.name || contact.push_name || 'Pelanggan') : (contact.name || contact.push_name || 'Pelanggan')}
              </h3>
              <p className="text-xs text-slate-400">
                {contact.push_name ? `WA Name: ${contact.push_name}` : 'Nama Belum Disimpan'}
              </p>
            </div>
            <a
              href={`https://wa.me/${contact.phone_number}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              Buka di WA
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>

          {/* Temperature Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">
              Suhu Minat Pelanggan (Lead Temperature)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemp('hot')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  temp === 'hot'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4 text-rose-400" /> Hot
              </button>
              <button
                type="button"
                onClick={() => setTemp('warm')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  temp === 'warm'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400" /> Warm
              </button>
              <button
                type="button"
                onClick={() => setTemp('cold')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  temp === 'cold'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Snowflake className="w-4 h-4 text-sky-300" /> Cold
              </button>
            </div>
          </div>

          {/* Pipeline Stage Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">
              Tahapan Penjualan (Pipeline Stage)
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as PipelineStage)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="lead_baru">Lead Baru</option>
              <option value="sedang_diskusi">Sedang Diskusi</option>
              <option value="closing">Closing / Deal</option>
              <option value="lost">Lost / Batal</option>
            </select>
          </div>

          {/* Custom Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">
              Label & Kategori (#Tags)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah tag baru (cth: VIP, Diskon10)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Internal Private Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Catatan Negosiasi Internal (Hanya Terlihat Oleh Anda)
              </label>
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis catatan janji follow-up, rincian preferensi pelanggan, catatan harga khusus..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveContactDetails}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-900/40 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          {/* Schedule Follow-up Reminder */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Jadwalkan Pengingat Follow-up
            </h4>
            <form onSubmit={handleScheduleReminder} className="space-y-2">
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              />
              <input
                type="text"
                placeholder="Catatan pengingat (cth: telepon ulang cek transfer)..."
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="submit"
                disabled={!reminderDate}
                className="w-full py-2 bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                Pasang Jadwal Alarm Follow-up
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
