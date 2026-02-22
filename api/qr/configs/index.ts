import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listQrRoutes, sanitizeQrId, upsertQrRoute } from '../../../lib/qrRouteStore';
import { enforceRateLimit, enforceWriteAuth, getClientIp } from '../../../lib/qrApiSecurity';

function parseJsonBody(req: VercelRequest): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  if (typeof req.body === 'object') return req.body as Record<string, unknown>;
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ip = getClientIp(req);

  if (req.method === 'GET') {
    const readRateLimit = enforceRateLimit({
      key: `qr-configs-read:${ip}`,
      limit: 180,
      windowMs: 60 * 1000
    });
    if (!readRateLimit.ok) {
      res.setHeader('Retry-After', String(readRateLimit.retryAfterSeconds));
      return res.status(429).json({ error: 'Rate limit exceeded.' });
    }

    const limit = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit);
    const result = await listQrRoutes(Number.isFinite(limit) ? limit : 50);
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const writeRateLimit = enforceRateLimit({
      key: `qr-configs-write:${ip}`,
      limit: 60,
      windowMs: 60 * 1000
    });
    if (!writeRateLimit.ok) {
      res.setHeader('Retry-After', String(writeRateLimit.retryAfterSeconds));
      return res.status(429).json({ error: 'Rate limit exceeded.' });
    }

    const auth = enforceWriteAuth(req);
    if (!auth.ok) {
      return res.status(auth.statusCode).json({ error: auth.error });
    }

    try {
      const body = parseJsonBody(req);
      const id = sanitizeQrId(body.id);
      if (!id) {
        return res.status(400).json({ error: 'A valid qr id is required.' });
      }

      const result = await upsertQrRoute(id, {
        name: typeof body.name === 'string' ? body.name : undefined,
        destination: typeof body.destination === 'string' ? body.destination : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        redirectType: body.redirectType as 'single' | 'smart' | 'conditional' | undefined,
        fallbackUrl: typeof body.fallbackUrl === 'string' ? body.fallbackUrl : undefined,
        openInNewTab: typeof body.openInNewTab === 'boolean' ? body.openInNewTab : undefined
      });

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request body.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
