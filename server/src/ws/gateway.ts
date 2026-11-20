import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getWhatsAppState } from '../whatsapp/client.js';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);

    // Send initial status immediately on connection
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
