import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { lead_id, deal_id, status, assignee, limit = '50' } = req.query;
    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(parseInt(limit as string, 10));

    if (lead_id) query = query.eq('lead_id', lead_id);
    if (deal_id) query = query.eq('deal_id', deal_id);
    if (status) query = query.eq('status', status);
    if (assignee) query = query.eq('assigned_to', assignee);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  }

  if (req.method === 'POST') {
    const { lead_id, deal_id, title, description, priority, due_date } =
      req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        lead_id,
        deal_id,
        title,
        description,
        priority: priority || 'medium',
        due_date,
        assigned_to: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
