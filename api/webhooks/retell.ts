import crypto from 'crypto';
import type { IncomingMessage } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Retell AI Webhook Endpoint
 *
 * Receives post-call callbacks from Retell.
 * Disables Vercel body parser to capture raw bytes for HMAC-SHA256 signature verification.
 * Forwards call_analyzed events to n8n Workflow 2 for Sheets logging + SMS summary.
 *
 * Flow: call ends → Retell POSTs here → verify sig → 200 OK → forward to n8n async
 *
 * Required env vars:
 *   RETELL_API_KEY          — from Retell dashboard → Settings → API Keys
 *   N8N_POST_CALL_WEBHOOK_URL — n8n Workflow 2 production webhook URL
 */

// Disable Vercel's automatic body parser — we need the raw bytes for HMAC sig verification.
// Retell signs the original request bytes; re-serialising req.body breaks comparison.
export const config = {
  api: { bodyParser: false },
};

/**
 * Verify Retell webhook signature.
 * Retell signs the raw request body with HMAC-SHA256 using the API key.
 * Header: x-retell-signature
 */
export function verifyRetellSignature(
  rawBody: string,
  signature: string,
  apiKey: string,
): boolean {
  if (!apiKey || !signature) return false;
  try {
    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody)
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const sigBuf = Buffer.from(signature, 'hex');
    // timingSafeEqual requires equal-length buffers — check first
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await readRawBody(req);
  const apiKey = process.env.RETELL_API_KEY ?? '';
  const signature = (req.headers['x-retell-signature'] as string) ?? '';

  if (apiKey) {
    const sigValid = verifyRetellSignature(rawBody, signature, apiKey);
    if (!sigValid) {
      console.warn('[retell] invalid signature — rejecting request');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (!body.event) {
    return res.status(400).json({ error: 'Missing event field' });
  }

  // Respond immediately — Retell times out if response is slow
  res.status(200).json({ received: true });

  // Process async after response (fire-and-forget, errors logged but not re-thrown)
  switch (body.event) {
    case 'call_analyzed':
      void forwardToN8n(body);
      break;
    case 'call_ended':
      console.log('[retell] call_ended', (body.call as Record<string, unknown>)?.call_id);
      break;
    case 'call_started':
      console.log('[retell] call_started', (body.call as Record<string, unknown>)?.call_id);
      break;
    default:
      console.log('[retell] unknown event:', body.event);
  }
}

async function forwardToN8n(payload: unknown): Promise<void> {
  const webhookUrl = process.env.N8N_POST_CALL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[retell] N8N_POST_CALL_WEBHOOK_URL not set — skipping forward to n8n');
    return;
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error('[retell] n8n forward failed:', response.status, await response.text());
    } else {
      console.log('[retell] call_analyzed forwarded to n8n');
    }
  } catch (err) {
    console.error('[retell] n8n forward error:', err);
  }
}
