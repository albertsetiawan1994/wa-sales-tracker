import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../db/supabase.js';

export const templatesRouter = Router();

// --- Quick Replies ---
templatesRouter.get('/quick-replies', async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('quick_replies').select('*').order('created_at', { ascending: true });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data || []);
});

templatesRouter.post('/quick-replies', async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { title, template_text, category } = req.body;

  if (!title || !template_text) {
    res.status(400).json({ error: 'Title and template_text are required' });
    return;
  }

  const { data, error } = await supabase
    .from('quick_replies')
    .insert({ title, template_text, category: category || 'General' })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// --- Scheduled Follow-up Reminders ---
templatesRouter.get('/reminders', async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { contact_jid } = req.query;

  let query = supabase.from('follow_up_reminders').select('*').order('scheduled_at', { ascending: true });
  if (contact_jid) {
    query = query.eq('contact_jid', String(contact_jid));
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data || []);
});

templatesRouter.post('/reminders', async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { contact_jid, scheduled_at, note } = req.body;

  if (!contact_jid || !scheduled_at) {
    res.status(400).json({ error: 'contact_jid and scheduled_at are required' });
    return;
  }

  const { data, error } = await supabase
    .from('follow_up_reminders')
    .insert({ contact_jid, scheduled_at, note: note || null, is_completed: false })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

templatesRouter.patch('/reminders/:id', async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { is_completed } = req.body;

  const { data, error } = await supabase
    .from('follow_up_reminders')
    .update({ is_completed: Boolean(is_completed) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});
