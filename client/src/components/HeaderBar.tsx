import React from 'react';
import {
  LayoutDashboard,
  Table,
  Inbox,
  Eye,
  EyeOff,
  Search,
  MessageSquareShare,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Contact } from '../types.js';

interface HeaderBarProps {
  contacts: Contact[];
  triageCount: number;
  currentView: 'kanban' | 'table' | 'triage';
  onViewChange: (view: 'kanban' | 'table' | 'triage') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isMasked: boolean;
  onToggleMask: () => void;
  onOpenQuickReplies: () => void;
}

export function HeaderBar({
  contacts,
  triageCount,
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  isMasked,
  onToggleMask,
  onOpenQuickReplies,
}: HeaderBarProps) {
  const unrepliedCount = contacts.filter((c) => c.sla_status === 'belum_dibalas').length;
  const followUpCount = contacts.filter((c) => c.sla_status === 'perlu_followup').length;

  return (
    <header className="bg-slate-800/90 border-b border-slate-700/80 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-6 py-3 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Brand & Stats Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">WA Sales Tracker</h1>
              <span className="text-[10px] text-emerald-400 font-medium">Mini-CRM & Follow-up</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/80 mx-1 hidden sm:block"></div>

          {/* Action Counters */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                unrepliedCount > 0
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                  : 'bg-slate-700/50 text-slate-400 border-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{unrepliedCount} Belum Dibalas</span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                followUpCount > 0
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{followUpCount} Perlu Follow-up</span>
            </div>
          </div>
        </div>

        {/* View Switcher & Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pelanggan..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => onViewChange('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                currentView === 'kanban'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => onViewChange('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                currentView === 'table'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Tabel
            </button>
            <button
              onClick={() => onViewChange('triage')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition relative ${
                currentView === 'triage'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Triage
              {triageCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                  {triageCount}
                </span>
              )}
            </button>
          </div>

          {/* Privacy Screen Masking Toggle */}
          <button
            onClick={onToggleMask}
            title={isMasked ? 'Nonaktifkan Mode Privasi' : 'Aktifkan Mode Privasi (Sensor Layar)'}
            className={`p-1.5 rounded-lg border transition ${
              isMasked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
          >
            {isMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Quick Replies Button */}
          <button
            onClick={onOpenQuickReplies}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium border border-slate-600 transition"
          >
            <MessageSquareShare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Pesan Cepat</span>
          </button>
        </div>
      </div>
    </header>
  );
}
