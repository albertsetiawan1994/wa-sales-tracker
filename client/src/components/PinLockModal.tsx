import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle } from 'lucide-react';
import { setStoredPin } from '../api.js';

interface PinLockModalProps {
  onUnlock: () => void;
  error?: string | null;
}

export function PinLockModal({ onUnlock, error }: PinLockModalProps) {
  const [pin, setPin] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setInputError('Silakan masukkan PIN akses aplikasi');
      return;
    }
    setStoredPin(pin.trim());
    setInputError(null);
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">Aplikasi Terkunci</h3>
        <p className="text-xs text-slate-400 mb-6">
          Masukkan Master PIN Anda untuk mengakses data pelanggan dan riwayat chat WhatsApp.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="Masukkan Master PIN..."
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono tracking-widest text-center"
              autoFocus
            />
          </div>

          {(inputError || error) && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{inputError || error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-900/40"
          >
            Buka Kunci Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
