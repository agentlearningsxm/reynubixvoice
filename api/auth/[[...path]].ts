import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.query.path as string[]) || [];
  const [resource] = path;

  // POST /api/auth/login
  if (
    resource === 'login' ||
    (!resource &&
      req.method === 'POST' &&
      req.body?.email &&
      req.body?.password)
  ) {
    if (req.method !== 'POST')
      return res.status(405).json({ error: 'Method not allowed' });
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return res.status(401).json({ error: error.message });
    if (!data.user) return res.status(401).json({ error: 'Login failed' });
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);
    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || 'viewer',
        full_name: profile?.full_name,
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    });
  }

  // GET /api/auth/session
  if (resource === 'session') {
    if (req.method !== 'GET')
      return res.status(405).json({ error: 'Method not allowed' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Not authenticated' });
    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user)
      return res.status(401).json({ error: 'Invalid or expired token' });
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', data.user.id)
      .single();
    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || 'viewer',
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
      },
    });
  }

  // POST /api/auth/logout
  if (resource === 'logout') {
    if (req.method !== 'POST')
      return res.status(405).json({ error: 'Method not allowed' });
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const supabase = getSupabaseAdmin();
      await supabase.auth.signOut({ scope: 'local' });
    }
    return res.json({ message: 'Logged out successfully' });
  }

  // POST /api/auth/create-admin
  if (resource === 'create-admin') {
    if (process.env.NODE_ENV === 'production')
      return res.status(403).json({ error: 'Disabled in production' });
    if (req.method !== 'POST')
      return res.status(405).json({ error: 'Method not allowed' });
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    const supabase = getSupabaseAdmin();
    const { data: user, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (authError) return res.status(400).json({ error: authError.message });
    await supabase.from('profiles').insert({
      id: user.user.id,
      email: user.user.email ?? email,
      full_name: name || email.split('@')[0],
      role: 'admin',
    });
    return res.json({ message: 'Admin created', userId: user.user.id });
  }

  res.status(404).json({ error: 'Auth route not found' });
}
