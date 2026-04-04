import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'Task ID is required' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: 'Task not found' });
    return res.json({ data });
  }

  if (req.method === 'PATCH') {
    const updates = { ...req.body };
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Task deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
