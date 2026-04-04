import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Disabled in production' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const supabase = getSupabaseAdmin();

  const { data: user, error: authError } = await supabase.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
    },
  );

  if (authError) {
    return res.status(400).json({ error: authError.message });
  }

  await supabase.from('profiles').insert({
    id: user.user.id,
    email: user.user.email ?? email,
    full_name: name || email.split('@')[0],
    role: 'admin',
  });

  return res.json({ message: 'Admin created', userId: user.user.id });
}
