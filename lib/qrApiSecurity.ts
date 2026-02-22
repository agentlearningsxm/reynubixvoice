import * as crypto from 'crypto';
import type { VercelRequest } from '@vercel/node';

type QrAuthResult = {
  ok: boolean;
  statusCode: number;
  error?: string;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

type GlobalQrRateLimitStore = typeof globalThis & {
  __reynubixQrRateLimits?: Map<string, number[]>;
};

const globalStore = globalThis as GlobalQrRateLimitStore;
const rateLimitStore = globalStore.__reynubixQrRateLimits ?? new Map<string, number[]>();
if (!globalStore.__reynubixQrRateLimits) globalStore.__reynubixQrRateLimits = rateLimitStore;

const QR_WRITE_TOKEN = process.env.QR_CONFIG_WRITE_TOKEN?.trim() || '';
const QR_ALLOW_UNAUTHENTICATED_WRITES = process.env.QR_ALLOW_UNAUTHENTICATED_WRITES === 'true';

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function headerValue(req: VercelRequest, name: string): string {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value : '';
}

export function getClientIp(req: VercelRequest): string {
  const xff = headerValue(req, 'x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function enforceWriteAuth(req: VercelRequest): QrAuthResult {
  const isProduction = process.env.VERCEL_ENV === 'production';

  if (!QR_WRITE_TOKEN) {
    if (!isProduction || QR_ALLOW_UNAUTHENTICATED_WRITES) {
      return { ok: true, statusCode: 200 };
    }
    return {
      ok: false,
      statusCode: 503,
      error: 'QR config writes are disabled because QR_CONFIG_WRITE_TOKEN is not configured.'
    };
  }

  const presented = headerValue(req, 'x-qr-admin-token');
  if (!presented || !timingSafeEqualStrings(QR_WRITE_TOKEN, presented)) {
    return {
      ok: false,
      statusCode: 401,
      error: 'Unauthorized QR config write.'
    };
  }

  return { ok: true, statusCode: 200 };
}

export function enforceRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucket = rateLimitStore.get(key) || [];
  const active = bucket.filter((timestamp) => timestamp > windowStart);

  if (active.length >= limit) {
    const oldest = active[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitStore.set(key, active);
    return { ok: false, retryAfterSeconds };
  }

  active.push(now);
  rateLimitStore.set(key, active);
  return { ok: true, retryAfterSeconds: 0 };
}
