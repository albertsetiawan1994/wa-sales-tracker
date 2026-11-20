import React from 'react';
import { Flame, Zap, Snowflake, AlertCircle, Clock, Check, MessageSquare, Phone } from 'lucide-react';
import { Contact } from '../types.js';

interface ContactTableProps {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  isMasked?: boolean;
}

export function ContactTable({ contacts, onSelectContact, isMasked }: ContactTableProps) {
  const maskString = (str: string) => {
    if (!isMasked || !str) return str;
    return str.substring(0, 3) + '••••' + str.slice(-2);
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'lead_baru':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300">Lead Baru</span>;
      case 'sedang_diskusi':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300">Sedang Diskusi</span>;
      case 'closing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">Closing / Deal</span>;
      case 'lost':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-400">Lost / Batal</span>;
      default:
        return stage;
    }
  };

  const getSlaBadge = (sla?: string) => {
    switch (sla) {
      case 'belum_dibalas':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1 animate-pulse">
            <AlertCircle className="w-2.5 h-2.5" /> Butuh Balasan
          </span>
        );
      case 'perlu_followup':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Perlu Follow-up
          </span>
        );
      case 'menunggu_respon':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/60 text-slate-300 inline-flex items-center gap-1">
            <Check className="w-2.5 h-2.5 text-emerald-400" /> Menunggu Respon
          </span>
        );
      default:
        return <span className="text-[10px] text-slate-500">-</span>;
    }
  };

  const getTemperatureBadge = (temp: 'hot' | 'warm' | 'cold') => {
    switch (temp) {
      case 'hot':
        return <span className="text-rose-400 font-semibold text-xs inline-flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> Hot</span>;
      case 'warm':
        return <span className="text-amber-400 font-semibold text-xs inline-flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Warm</span>;
      case 'cold':
        return <span className="text-sky-300 font-semibold text-xs inline-flex items-center gap-1"><Snowflake className="w-3.5 h-3.5" /> Cold</span>;
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-700 text-[10px] tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Pelanggan</th>
              <th className="py-3.5 px-4">Suhu Lead</th>
              <th className="py-3.5 px-4">Tahapan Pipeline</th>
              <th className="py-3.5 px-4">Status Aksi (SLA)</th>
              <th className="py-3.5 px-4">Pesan Terakhir</th>
              <th className="py-3.5 px-4">Interaksi Terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Belum ada pelanggan yang terdaftar di pipeline sales.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.jid}
                  onClick={() => onSelectContact(contact)}
                  className="hover:bg-slate-700/30 cursor-pointer transition"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">
                      {isMasked ? maskString(contact.name || contact.push_name || 'Pelanggan') : (contact.name || contact.push_name || 'Pelanggan')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      +{isMasked ? maskString(contact.phone_number) : contact.phone_number}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {getTemperatureBadge(contact.temperature)}
                  </td>

                  <td className="py-3 px-4">
                    {getStageLabel(contact.pipeline_stage)}
                  </td>

                  <td className="py-3 px-4">
                    {getSlaBadge(contact.sla_status)}
                  </td>

                  <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                    {isMasked ? '••••••••••••••••' : (contact.last_message_text || '-')}
                  </td>

                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {contact.last_message_at
                      ? new Date(contact.last_message_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
