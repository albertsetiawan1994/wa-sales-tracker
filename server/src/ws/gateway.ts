import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { getWhatsAppState } from '../whatsapp/client.js';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function verifyWsAuth(req: IncomingMessage): boolean {
  const configuredPin = process.env.APP_PIN;
  if (!configuredPin) {
    // Dev mode with no PIN configured
    return true;
  }

  // Check header
  const headerPin = req.headers['x-app-pin'];
  if (headerPin === configuredPin) {
    return true;
  }

  // Check query parameter ?pin=...
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const queryPin = url.searchParams.get('pin');
    if (queryPin === configuredPin) {
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
