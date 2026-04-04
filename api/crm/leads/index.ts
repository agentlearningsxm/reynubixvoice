import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const {
      page = '1',
      limit = '20',
      status,
      search,
      sort = 'created_at',
      order = 'desc',
    } = req.query;
    const offset =
      (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order(sort as string, { ascending: order === 'asc' })
      .range(offset, offset + parseInt(limit as string, 10) - 1);

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data, count, page: parseInt(page as string, 10) });
  }

  if (req.method === 'POST') {
    const { email, name, company, phone, source, status, tags } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { data, error } = await supabase
      .from('leads')
      .insert({
        email,
        email_normalized: email.toLowerCase().trim(),
        name,
        company,
        phone,
        source: source || 'manual',
        status: status || 'new',
        tags: tags || [],
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
