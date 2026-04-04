import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { stage } = req.query;
    let query = supabase
      .from('deals')
      .select('*, leads(email, name, company)')
      .order('created_at', { ascending: false });

    if (stage) query = query.eq('stage', stage);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  }

  if (req.method === 'POST') {
    const {
      lead_id,
      title,
      description,
      stage,
      value,
      probability,
      expected_close_date,
    } = req.body;
    if (!lead_id || !title) {
      return res.status(400).json({ error: 'lead_id and title are required' });
    }

    const { data, error } = await supabase
      .from('deals')
      .insert({
        lead_id,
        title,
        description,
        stage: stage || 'qualification',
        value,
        probability,
        expected_close_date,
        created_by: user.id,
        assigned_to: user.id,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
