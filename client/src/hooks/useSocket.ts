import { useState, useEffect, useRef, useCallback } from 'react';
import { WhatsAppConnectionState, Contact } from '../types.js';
import { getStoredPin } from '../api.js';

interface UseSocketOptions {
  isUnlocked?: boolean;
  onContactUpdated?: (contact: Contact) => void;
  onMessageReceived?: (data: any) => void;
}

export function useSocket(options?: UseSocketOptions) {
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    status: 'connecting',
    qrCode: null,
    userPhone: null,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isUnlocked = options?.isUnlocked ?? false;

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
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isClosedIntentionally = false;

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn('Failed to create WebSocket instance', err);
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
            setConnectionState((prev) => ({
              ...prev,
              status: 'connecting',
              qrCode: payload.data.qrCode,
              lastError: null,
            }));
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
            optionsRef.current?.onContactUpdated?.(payload.data);
            break;
          case 'message_received':
            optionsRef.current?.onMessageReceived?.(payload.data);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = () => {
      if (!isClosedIntentionally) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    return () => {
      isClosedIntentionally = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect, isUnlocked]);

  return { connectionState, setConnectionState };
}
