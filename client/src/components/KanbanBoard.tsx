import React from 'react';
import { Flame, Zap, Snowflake, AlertCircle, Clock, Check, ChevronRight, ChevronLeft, Tag } from 'lucide-react';
import { Contact, PipelineStage } from '../types.js';

interface KanbanBoardProps {
  contacts: Contact[];
  onMoveStage: (jid: string, newStage: PipelineStage) => void;
  onSelectContact: (contact: Contact) => void;
  isMasked?: boolean;
}

const COLUMNS: { id: PipelineStage; title: string; color: string; badgeColor: string }[] = [
  { id: 'lead_baru', title: 'Lead Baru', color: 'border-blue-500/30', badgeColor: 'bg-blue-500/20 text-blue-300' },
  { id: 'sedang_diskusi', title: 'Sedang Diskusi', color: 'border-purple-500/30', badgeColor: 'bg-purple-500/20 text-purple-300' },
  { id: 'closing', title: 'Closing / Deal', color: 'border-emerald-500/30', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
  { id: 'lost', title: 'Lost / Batal', color: 'border-slate-600/30', badgeColor: 'bg-slate-700 text-slate-400' },
];

export function KanbanBoard({ contacts, onMoveStage, onSelectContact, isMasked }: KanbanBoardProps) {
  const maskString = (str: string) => {
    if (!isMasked || !str) return str;
    return str.substring(0, 3) + '••••' + str.slice(-2);
  };

  const getTemperatureIcon = (temp: 'hot' | 'warm' | 'cold') => {
    switch (temp) {
      case 'hot':
        return <span title="Hot Lead" className="text-rose-400 flex items-center gap-0.5"><Flame className="w-3.5 h-3.5" /></span>;
      case 'warm':
        return <span title="Warm Lead" className="text-amber-400 flex items-center gap-0.5"><Zap className="w-3.5 h-3.5" /></span>;
      case 'cold':
        return <span title="Cold Lead" className="text-sky-300 flex items-center gap-0.5"><Snowflake className="w-3.5 h-3.5" /></span>;
    }
  };

  const getSlaBadge = (sla?: string) => {
    switch (sla) {
      case 'belum_dibalas':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
            <AlertCircle className="w-2.5 h-2.5" /> Belum Dibalas
          </span>
        );
      case 'perlu_followup':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Perlu Follow-up
          </span>
        );
      case 'menunggu_respon':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/60 text-slate-300 flex items-center gap-1">
            <Check className="w-2.5 h-2.5 text-emerald-400" /> Menunggu Respon
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col, colIdx) => {
        const columnContacts = contacts.filter((c) => c.pipeline_stage === col.id);

        return (
          <div
            key={col.id}
            className={`bg-slate-800/70 border ${col.color} rounded-2xl p-4 shadow-xl flex flex-col min-h-[500px] backdrop-blur`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${col.badgeColor}`}>
                  {columnContacts.length}
                </span>
                <h3 className="font-bold text-white text-sm">{col.title}</h3>
              </div>
            </div>

            {/* Column Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
              {columnContacts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-700/60 rounded-xl">
                  Tidak ada prospek di tahapan ini
                </div>
              ) : (
                columnContacts.map((contact) => (
                  <div
                    key={contact.jid}
                    onClick={() => onSelectContact(contact)}
                    className="bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-3.5 shadow-md cursor-pointer transition group"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getTemperatureIcon(contact.temperature)}
                        <span className="font-semibold text-white text-xs truncate">
                          {isMasked ? maskString(contact.name || contact.push_name || 'Pelanggan') : (contact.name || contact.push_name || 'Pelanggan')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        +{isMasked ? maskString(contact.phone_number) : contact.phone_number}
                      </span>
                    </div>

                    {/* SLA Badge */}
                    <div className="mb-2">
                      {getSlaBadge(contact.sla_status)}
                    </div>

                    {/* Message Preview */}
                    <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800">
                      {isMasked ? '••••••••••••••••••••' : (contact.last_message_text || 'Belum ada pesan')}
                    </p>

                    {/* Tags */}
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {contact.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5"
                          >
                            <Tag className="w-2 h-2" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stage shift actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                      <button
                        disabled={colIdx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (colIdx > 0) onMoveStage(contact.jid, COLUMNS[colIdx - 1].id);
                        }}
                        className="hover:text-emerald-400 p-1 rounded disabled:opacity-20 transition"
                        title="Geser ke tahapan sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[9px] text-slate-500">Klik untuk detail</span>

                      <button
                        disabled={colIdx === COLUMNS.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (colIdx < COLUMNS.length - 1) onMoveStage(contact.jid, COLUMNS[colIdx + 1].id);
                        }}
                        className="hover:text-emerald-400 p-1 rounded disabled:opacity-20 transition"
                        title="Geser ke tahapan berikutnya"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
