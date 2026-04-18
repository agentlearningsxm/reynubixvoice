import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();
  const path = (req.query.path as string[]) || [];
  const [resource, id] = path;

  if (resource === 'dashboard' || !resource) {
    if (req.method !== 'GET')
      return res.status(405).json({ error: 'Method not allowed' });
    const { data: leads } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .limit(50);
    const { data: deals } = await supabase
      .from('deals')
      .select('*', { count: 'exact' })
      .limit(50);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .limit(50);
    return res.json({
      leads: { data: leads || [], count: 0 },
      deals: { data: deals || [], count: 0 },
      tasks: { data: tasks || [], count: 0 },
    });
  }

  if (resource === 'leads') {
    if (id) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const { data, error } = await supabase
          .from('leads')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }
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
      if (search)
        query = query.or(
          `email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`,
        );
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (resource === 'deals') {
    if (id) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const { data, error } = await supabase
          .from('deals')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('deals').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('deals')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ data, count });
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase
        .from('deals')
        .insert(req.body)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ data });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (resource === 'tasks') {
    if (id) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const { data, error } = await supabase
          .from('tasks')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ data, count });
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase
        .from('tasks')
        .insert(req.body)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ data });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (resource === 'notes') {
    if (id) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const { data, error } = await supabase
          .from('notes')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (req.method === 'GET') {
      const { lead_id } = req.query;
      let query = supabase
        .from('notes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (lead_id) query = query.eq('lead_id', lead_id);
      const { data, error, count } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ data, count });
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase
        .from('notes')
        .insert(req.body)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ data });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (resource === 'interactions') {
    if (id) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('interactions')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const { data, error } = await supabase
          .from('interactions')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ data });
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase
          .from('interactions')
          .delete()
          .eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (req.method === 'GET') {
      const { lead_id } = req.query;
      let query = supabase
        .from('interactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (lead_id) query = query.eq('lead_id', lead_id);
      const { data, error, count } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ data, count });
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase
        .from('interactions')
        .insert(req.body)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ data });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(404).json({ error: 'Resource not found' });
}
