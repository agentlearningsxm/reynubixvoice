import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveQrRedirect, sanitizeQrId } from '../../lib/qrRouteStore';
import { enforceRateLimit, getClientIp } from '../../lib/qrApiSecurity';

function wantsJson(req: VercelRequest): boolean {
  const format = Array.isArray(req.query.format) ? req.query.format[0] : req.query.format;
  if (format === 'json') return true;
  const accept = req.headers.accept;
  return typeof accept === 'string' && accept.includes('application/json');
}

function redirect(res: VercelResponse, location: string, statusCode = 302): void {
  res.statusCode = statusCode;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', location);
  res.end();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit({
    key: `qr-redirect:${ip}`,
    limit: 600,
    windowMs: 60 * 1000
  });
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({ error: 'Rate limit exceeded.' });
  }

  const rawQrId = Array.isArray(req.query.qrId) ? req.query.qrId[0] : req.query.qrId;
  const qrId = sanitizeQrId(rawQrId);
  if (!qrId) {
    return res.status(400).json({ error: 'Invalid qr id.' });
  }

  const resolved = await resolveQrRedirect(qrId);

  if (wantsJson(req)) {
    return res.status(resolved.found ? 200 : 404).json({
      qrId,
      ...resolved
    });
  }

  const statusCode = resolved.enabled ? 302 : 307;
  return redirect(res, resolved.target, statusCode);
}
