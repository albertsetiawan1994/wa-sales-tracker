import { useState, useEffect, useCallback } from 'react';
import { WhatsAppConnectionState, Contact } from '../types.js';
import { getStoredPin } from '../api.js';

interface UseSocketOptions {
  onContactUpdated?: (contact: Contact) => void;
  onMessageReceived?: (data: any) => void;
}

export function useSocket(options?: UseSocketOptions) {
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    status: 'disconnected',
    qrCode: null,
    userPhone: null,
  });

  const connect = useCallback(() => {
    let wsUrl: string;
    const baseApi = import.meta.env.VITE_API_URL;
    const pin = getStoredPin();
    const pinParam = pin ? `?pin=${encodeURIComponent(pin)}` : '';

    if (baseApi) {
      const parsed = new URL(baseApi);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProtocol}//${parsed.host}/ws${pinParam}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws${pinParam}`;
    }

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return () => {};
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        switch (payload.type) {
          case 'status':
            setConnectionState(payload.data);
            break;
          case 'qr_code':
            setConnectionState((prev) => ({ ...prev, qrCode: payload.data.qrCode }));
            break;
          case 'status_change':
            setConnectionState((prev) => ({
              ...prev,
              status: payload.data.status,
              userPhone: payload.data.userPhone || prev.userPhone,
              qrCode: payload.data.status === 'connected' ? null : prev.qrCode,
            }));
            break;
          case 'contact_updated':
            options?.onContactUpdated?.(payload.data);
            break;
          case 'message_received':
            options?.onMessageReceived?.(payload.data);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = () => {
      setTimeout(connect, 3000);
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [options]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { connectionState };
}
