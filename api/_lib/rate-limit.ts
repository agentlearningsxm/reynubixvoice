/**
 * In-memory sliding-window rate limiter.
 *
 * Each Vercel serverless instance gets its own Map, which is fine for basic
 * abuse prevention (spray-style bots). For strict global limiting you would
 * need Redis/Upstash — this is intentionally simple.
 */

const store = new Map<string, number[]>();

/** Remove entries older than `windowMs` and keys with no timestamps left. */
function cleanup(windowMs: number) {
  const now = Date.now();
  for (const [key, timestamps] of store) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      store.set(key, valid);
    }
  }
}

// Periodically purge stale entries so the Map doesn't grow unbounded.
// 60 s interval — lightweight; a no-op when the map is empty.
setInterval(() => cleanup(120_000), 60_000).unref();

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds the caller should wait before retrying (only set when blocked). */
  retryAfterMs?: number;
}

/**
 * Check whether `key` (typically an IP) is within the allowed request budget.
 *
 * @param key          Identifier to rate-limit (IP address, API key, etc.)
 * @param windowMs     Sliding window size in milliseconds.
 * @param maxRequests  Maximum requests allowed inside the window.
 */
export function checkRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number,
): RateLimitResult {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    // Oldest timestamp in the window determines when a slot frees up.
    const oldest = timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    store.set(key, timestamps);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true };
}
