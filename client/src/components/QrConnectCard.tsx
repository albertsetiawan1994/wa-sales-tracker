import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CheckCircle, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';
import { WhatsAppConnectionState } from '../types.js';

interface QrConnectCardProps {
  connectionState: WhatsAppConnectionState;
  onRefresh?: () => void;
}

export function QrConnectCard({ connectionState, onRefresh }: QrConnectCardProps) {
  const { status, qrCode, userPhone } = connectionState;

  if (status === 'connected') {
    return (
      <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
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
        Buka WhatsApp di HP Anda $\rightarrow$ ketuk <b>Perangkat Tertaut</b> $\rightarrow$ pindai kode QR di bawah untuk menghubungkan aplikasi sales tracker.
      </p>

      <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-6">
        {qrCode ? (
          <QRCodeSVG value={qrCode} size={220} level="M" />
        ) : (
          <div className="w-[220px] h-[220px] flex flex-col items-center justify-center bg-slate-100 rounded-lg text-slate-500 gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Membuat Kode QR...</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-900/60 py-2.5 px-4 rounded-lg border border-slate-700/50 mb-4">
        <Smartphone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>Sesi aman & tersimpan otomatis di cloud database pribadi Anda</span>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Muat Ulang Kode QR
        </button>
      )}
    </div>
  );
}
