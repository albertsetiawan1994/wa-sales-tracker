import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../db/supabase.js';
import { computeSlaStatus } from '../whatsapp/status-engine.js';
import { broadcastEvent } from '../ws/gateway.js';

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
      const s = String(search);
      query = query.or(`name.ilike.%${s}%,phone_number.ilike.%${s}%,push_name.ilike.%${s}%`);
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
