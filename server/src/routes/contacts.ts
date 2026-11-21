import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../db/supabase.js';
import { computeSlaStatus } from '../whatsapp/status-engine.js';
import { broadcastEvent } from '../ws/gateway.js';
import { sendWhatsAppMessage } from '../whatsapp/client.js';

export const contactsRouter = Router();

contactsRouter.get('/', async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { is_customer, pipeline_stage, search } = req.query;

  try {
    let query = supabase.from('contacts').select('*').order('last_message_at', { ascending: false, nullsFirst: false });

    if (is_customer !== undefined) {
      query = query.eq('is_customer', is_customer === 'true');
    }

    if (pipeline_stage) {
      query = query.eq('pipeline_stage', String(pipeline_stage));
    }

    if (search) {
      // Sanitize special characters that interfere with PostgREST .or() syntax
      const sanitized = String(search).replace(/[,()[\]{}"\\]/g, ' ').trim();
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,phone_number.ilike.%${sanitized}%,push_name.ilike.%${sanitized}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // Attach dynamically calculated sla_status to each contact
    const enriched = (data || []).map((contact) => ({
      ...contact,
      sla_status: computeSlaStatus(contact.last_message_at, contact.last_sender_is_me),
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

contactsRouter.patch('/:jid', async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const jid = req.params.jid;
  const updates = req.body;

  try {
    const allowedFields = [
      'is_customer',
      'pipeline_stage',
      'temperature',
      'tags',
      'internal_notes',
      'name',
    ];

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        payload[key] = updates[key];
      }
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(payload)
      .eq('jid', jid)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const enriched = {
      ...data,
      sla_status: computeSlaStatus(data.last_message_at, data.last_sender_is_me),
    };

    // Broadcast real-time update to all connected frontend clients
    broadcastEvent('contact_updated', enriched);

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send WhatsApp message directly from web dashboard
contactsRouter.post('/:jid/messages', async (req: Request, res: Response) => {
  const jid = String(req.params.jid);
  const { text } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Isi pesan tidak boleh kosong' });
    return;
  }

  try {
    await sendWhatsAppMessage(jid, text.trim());
    res.json({ ok: true, message: 'Pesan berhasil dikirim via WhatsApp' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mengirim pesan via WhatsApp' });
  }
});
