import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body || {};

    console.log(`[webhook] Received ${type || 'unknown'} webhook`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
