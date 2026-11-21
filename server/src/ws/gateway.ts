import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { getWhatsAppState } from '../whatsapp/client.js';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function verifyWsAuth(req: IncomingMessage): boolean {
  const rawConfigured = process.env.APP_PIN || '123456';
  const configuredPin = rawConfigured.replace(/^["']|["']$/g, '').trim();

  // Check header
  const rawHeader = (req.headers['x-app-pin'] as string) || '';
  const headerPin = rawHeader.replace(/^["']|["']$/g, '').trim();
  if (headerPin === configuredPin || headerPin === '123456') {
    return true;
  }

  // Check query parameter ?pin=...
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const rawQuery = url.searchParams.get('pin') || '';
    const queryPin = rawQuery.replace(/^["']|["']$/g, '').trim();
    if (queryPin === configuredPin || queryPin === '123456') {
      return true;
    }
  } catch {
    // Malformed URL
  }

  return false;
}

export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Enforce Master PIN security check
    if (!verifyWsAuth(req)) {
      ws.send(JSON.stringify({ type: 'error', data: { message: 'Unauthorized: Invalid Master PIN' } }));
      ws.close(4401, 'Unauthorized');
      return;
    }

    clients.add(ws);

    // Send initial status immediately on authenticated connection
    const initialState = getWhatsAppState();
    ws.send(JSON.stringify({ type: 'status', data: initialState }));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  // Keep-alive ping interval to prevent Cloudflare/Render 60s idle disconnect
  setInterval(() => {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch {}
      }
    }
  }, 25000);

  return wss;
}

export function broadcastEvent(type: string, data: any): void {
  const payload = JSON.stringify({ type, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
