import { redisEnabled, redisIncr } from "@/lib/redis";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Sliding-window rate limit.
 * Uses Upstash Redis when configured (shared across serverless instances);
 * falls back to in-memory for local/dev.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

  if (redisEnabled()) {
    const count = await redisIncr(`rl:${key}`, windowSec);
    if (count !== null) {
      if (count > limit) {
        return { ok: false, retryAfterSec: windowSec };
      }
      return { ok: true };
    }
  }

  const now = Date.now();
  const bucket = buckets.get(key);

  // Opportunistic cleanup of expired buckets
  if (buckets.size > 500) {
    Array.from(buckets.entries()).forEach(([k, b]) => {
      if (now >= b.resetAt) buckets.delete(k);
    });
  }

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}
