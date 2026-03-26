import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rejectMethod } from '../_lib/http.js';

/**
 * n8n Webhook Endpoint
 *
 * Receives incoming webhook calls from n8n automation workflows.
 * Configure N8N_WEBHOOK_URL in .env to enable outbound triggers.
 * Configure N8N_WEBHOOK_SECRET in .env to enable HMAC-SHA256 signature verification.
 *
 * Inbound use cases:
 * - n8n triggers actions on the website (e.g., update lead status)
 * - Sync data from external systems back to Supabase
 *
 * Outbound (from contact.ts → n8n):
 * - New lead submitted → n8n picks up for CRM, follow-up, Retell call
 */

/**
 * Verify n8n webhook signature (HMAC-SHA256).
 * If N8N_WEBHOOK_SECRET is not set, skip verification (backwards compatible).
 * Header: x-n8n-signature
 */
function verifyN8nSignature(req: VercelRequest): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET ?? '';
  if (!secret) return true; // no secret configured — allow all requests

  const signature = (req.headers['x-n8n-signature'] as string) ?? '';
  if (!signature) return false;

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const sigBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  if (!verifyN8nSignature(req)) {
    console.warn('[n8n] invalid signature — rejecting request');
    return res.status(401).json({ error: 'Invalid signature' });
  }

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
