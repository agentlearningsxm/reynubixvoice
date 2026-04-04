import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseAdmin();

  const [
    { data: dashboard },
    { data: recentLeads },
    { data: recentDeals },
    { data: overdueTasks },
    { data: recentInteractions },
  ] = await Promise.all([
    supabase.from('reporting_crm_dashboard').select('*').single(),
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('deals')
      .select('*, leads(name, company)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  return res.json({
    stats: dashboard || {},
    recent_leads: recentLeads || [],
    recent_deals: recentDeals || [],
    overdue_tasks: overdueTasks || [],
    recent_interactions: recentInteractions || [],
  });
}
