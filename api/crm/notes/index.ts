import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { lead_id, deal_id } = req.query;
    let query = supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (lead_id) query = query.eq('lead_id', lead_id);
    if (deal_id) query = query.eq('deal_id', deal_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  }

  if (req.method === 'POST') {
    const { lead_id, deal_id, body, is_pinned } = req.body;
    if (!body) return res.status(400).json({ error: 'Body is required' });

    const { data, error } = await supabase
      .from('notes')
      .insert({
        lead_id,
        deal_id,
        body,
        is_pinned: is_pinned || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
