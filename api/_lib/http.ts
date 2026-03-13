import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function readJsonBody<T>(req: VercelRequest) {
  if (!req.body) {
    return {} as T;
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as T;
  }

  return req.body as T;
}

export function rejectMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethod = 'POST',
) {
  if (req.method !== allowedMethod) {
    res.status(405).json({ error: 'Method not allowed' });
    return true;
  }

  return false;
}

export function getClientIp(req: VercelRequest) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();

  return ip || req.socket.remoteAddress || '';
}

export function hashIp(ip: string) {
  if (!ip) return null;
  const salt = process.env.TRACKING_HASH_SALT || 'reynubixvoice';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}
