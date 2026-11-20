import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { createAuthMiddleware } from './routes/auth.js';
import { contactsRouter } from './routes/contacts.js';
import { templatesRouter } from './routes/templates.js';
import { initWebSocketServer, broadcastEvent } from './ws/gateway.js';
import { initWhatsApp, getWhatsAppState } from './whatsapp/client.js';

dotenv.config();

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Public health check and connection status
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (_req, res) => {
  res.json(getWhatsAppState());
});

// Protected routes (Master PIN)
app.use('/api', createAuthMiddleware());
app.use('/api/contacts', contactsRouter);
app.use('/api', templatesRouter);

// Initialize WebSocket Gateway
initWebSocketServer(server);

// Start WhatsApp Client in Background
initWhatsApp({
  onQrCode: (qr) => {
    broadcastEvent('qr_code', { qrCode: qr });
  },
  onStatusChange: (status, userPhone) => {
    broadcastEvent('status_change', { status, userPhone });
  },
  onMessageReceived: (data) => {
    broadcastEvent('message_received', data);
  },
}).catch((err) => {
  console.error('Failed to initialize WhatsApp socket:', err);
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`WhatsApp Sales Tracker Server running on port ${PORT}`);
  });
}

export { app, server };
