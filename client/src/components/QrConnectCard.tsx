import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CheckCircle, Smartphone, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { WhatsAppConnectionState } from '../types.js';

interface QrConnectCardProps {
  connectionState: WhatsAppConnectionState;
  onRefresh?: () => Promise<void> | void;
  onLogout?: () => Promise<void> | void;
}

export function QrConnectCard({ connectionState, onRefresh, onLogout }: QrConnectCardProps) {
  const { status, qrCode, userPhone, lastError } = connectionState;
  const [isBusy, setIsBusy] = useState(false);

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    setIsBusy(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsBusy(false), 800);
    }
  };

  const handleLogoutClick = async () => {
    if (!onLogout) return;
    const confirm = window.confirm(
      'Apakah Anda yakin ingin memutuskan nomor WhatsApp yang sedang terhubung dan memindai nomor baru?'
    );
    if (!confirm) return;

    setIsBusy(true);
    try {
      await onLogout();
    } finally {
      setIsBusy(false);
    }
  };

  if (status === 'connected') {
    return (
      <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">WhatsApp Terhubung</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-xs text-slate-400">
              Nomor: <span className="font-mono text-emerald-300 font-medium">+{userPhone || 'Aktif'}</span> (Sinkronisasi Otomatis)
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={handleLogoutClick}
            disabled={isBusy}
            className="text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 self-start sm:self-center disabled:opacity-50"
            title="Putus koneksi nomor ini dan pindai nomor baru"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isBusy ? 'Memutuskan...' : 'Putus Koneksi / Ganti Nomor'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 max-w-md mx-auto my-8 shadow-2xl text-center backdrop-blur">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
        <QrCode className="w-6 h-6" />
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Hubungkan WhatsApp Anda</h2>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Buka WhatsApp di HP Anda → ketuk <b>Perangkat Tertaut</b> → pindai kode QR di bawah untuk menghubungkan aplikasi sales tracker.
      </p>

      <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-6">
        {qrCode ? (
          <QRCodeSVG value={qrCode} size={220} level="M" />
        ) : (
          <div className="w-[220px] h-[220px] flex flex-col items-center justify-center bg-slate-100 rounded-lg text-slate-500 gap-3 p-4">
            <RefreshCw className={`w-8 h-8 text-emerald-600 ${isBusy ? 'animate-spin' : 'animate-spin'}`} />
            <span className="text-xs font-medium text-slate-700">
              {status === 'connecting' ? 'Membuat Kode QR...' : 'Menghubungkan ke Server...'}
            </span>
            <span className="text-[11px] text-slate-400 text-center leading-tight">
              Menunggu respon dari WhatsApp socket
            </span>
          </div>
        )}
      </div>

      {lastError && (
        <div className="mb-4 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2.5 flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span className="truncate">{lastError.message || 'Koneksi terputus, mencoba menyambungkan ulang...'}</span>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-900/60 py-2.5 px-4 rounded-lg border border-slate-700/50 mb-4">
        <Smartphone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>Sesi aman & tersimpan otomatis di cloud database pribadi Anda</span>
      </div>

      {onRefresh && (
        <button
          onClick={handleRefreshClick}
          disabled={isBusy}
          className="text-xs bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 rounded-lg transition flex items-center gap-2 mx-auto border border-slate-600/50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
          <span>{isBusy ? 'Menyambungkan...' : 'Muat Ulang / Buat Kode QR Baru'}</span>
        </button>
      )}
    </div>
  );
}
