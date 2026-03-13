import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rejectMethod } from '../_lib/http';

/**
 * Retell AI Webhook Endpoint
 *
 * Receives callbacks from Retell after voice calls complete.
 * Used for: call status updates, transcript delivery, booking confirmations.
 *
 * Flow: Lead fills contact form → n8n triggers Retell outbound call →
 *       Retell calls lead → call ends → Retell sends result here
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  // TODO: Verify Retell webhook signature
  // const apiKey = process.env.RETELL_API_KEY;

  const body = req.body;

  if (!body || !body.event) {
    return res.status(400).json({ error: 'Missing event field' });
  }

  switch (body.event) {
    case 'call_started':
    case 'call_ended':
    case 'call_analyzed':
      // TODO: Update lead status in Supabase based on call outcome
      console.log(
        `Retell event: ${body.event}`,
        JSON.stringify(body).slice(0, 500),
      );
      return res.status(200).json({ received: true });

    default:
      return res.status(400).json({ error: `Unknown event: ${body.event}` });
  }
}
