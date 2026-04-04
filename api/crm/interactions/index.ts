import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { lead_id, deal_id, type, status, limit = '50' } = req.query;
    let query = supabase
      .from('interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string, 10));

    if (lead_id) query = query.eq('lead_id', lead_id);
    if (deal_id) query = query.eq('deal_id', deal_id);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  }

  if (req.method === 'POST') {
    const {
      lead_id,
      deal_id,
      type,
      title,
      body,
      direction,
      status,
      scheduled_at,
      metadata,
    } = req.body;
    if (!lead_id || !type || !title) {
      return res
        .status(400)
        .json({ error: 'lead_id, type, and title are required' });
    }

    const { data, error } = await supabase
      .from('interactions')
      .insert({
        lead_id,
        deal_id,
        type,
        title,
        body,
        direction: direction || 'outbound',
        status: status || 'completed',
        scheduled_at,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        created_by: user.id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
