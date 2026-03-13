import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rejectMethod } from '../_lib/http';

/**
 * n8n Webhook Endpoint
 *
 * Receives incoming webhook calls from n8n automation workflows.
 * Configure N8N_WEBHOOK_URL in .env to enable outbound triggers.
 *
 * Inbound use cases:
 * - n8n triggers actions on the website (e.g., update lead status)
 * - Sync data from external systems back to Supabase
 *
 * Outbound (from contact.ts → n8n):
 * - New lead submitted → n8n picks up for CRM, follow-up, Retell call
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  // TODO: Add webhook signature verification for security
  // const signature = req.headers['x-n8n-signature'];

  const body = req.body;

  if (!body || !body.action) {
    return res.status(400).json({ error: 'Missing action field' });
  }

  switch (body.action) {
    case 'ping':
      return res
        .status(200)
        .json({ status: 'ok', timestamp: new Date().toISOString() });

    default:
      return res.status(400).json({ error: `Unknown action: ${body.action}` });
  }
}
