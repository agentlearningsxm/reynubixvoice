import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const _token = authHeader.split(' ')[1];
    const supabase = getSupabaseAdmin();
    await supabase.auth.signOut({ scope: 'local' });
  }

  return res.json({ message: 'Logged out successfully' });
}
