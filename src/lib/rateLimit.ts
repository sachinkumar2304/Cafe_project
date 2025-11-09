// Simple in-memory rate limiter (per-process). For multi-instance, replace with Redis.
type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

export function rateLimit({ key, windowMs, max }: { key: string; windowMs: number; max: number }) {
  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: max, last: now };
  const elapsed = now - bucket.last;
  const refill = Math.floor(elapsed / windowMs) * max; // full refill per window
  const tokens = Math.min(max, bucket.tokens + (refill > 0 ? refill : 0));
  const newBucket = { tokens, last: refill > 0 ? now : bucket.last };

  if (newBucket.tokens <= 0) {
    buckets.set(key, newBucket);
    return { allowed: false } as const;
  }
  newBucket.tokens -= 1;
  buckets.set(key, newBucket);
  return { allowed: true } as const;
}

export function ipKey(request: Request, path: string) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  return `${path}:${ip}`;
}
