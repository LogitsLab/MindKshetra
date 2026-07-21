/**
 * Upstash Redis REST helpers for shared rate limits + story cache.
 *
 * Required on Vercel for correct multi-instance behavior:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Locally, memory fallback is fine when unset.
 */

const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

let warnedMissing = false;

export function redisEnabled(): boolean {
  return Boolean(url && token);
}

/** True when running on Vercel without Redis configured. */
export function redisMissingOnVercel(): boolean {
  return process.env.VERCEL === "1" && !redisEnabled();
}

export function warnIfRedisMissing(): void {
  if (warnedMissing || !redisMissingOnVercel()) return;
  warnedMissing = true;
  console.warn(
    "[mindkshetra] UPSTASH_REDIS_REST_URL/TOKEN unset on Vercel — rate limits and story cache are per-instance memory only. Set Upstash Redis for production."
  );
}

async function redisCommand<T = unknown>(
  command: (string | number)[]
): Promise<T | null> {
  if (!url || !token) {
    warnIfRedisMissing();
    return null;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[mindkshetra] Redis command failed", res.status, command[0]);
      return null;
    }
    const data = (await res.json()) as { result?: T };
    return (data.result ?? null) as T | null;
  } catch (err) {
    console.warn("[mindkshetra] Redis request error", err);
    return null;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const result = await redisCommand<string | null>(["GET", key]);
  return result ?? null;
}

export async function redisSet(
  key: string,
  value: string,
  ttlSec?: number
): Promise<boolean> {
  const cmd: (string | number)[] =
    ttlSec && ttlSec > 0
      ? ["SET", key, value, "EX", ttlSec]
      : ["SET", key, value];
  const result = await redisCommand(cmd);
  return result !== null;
}

/** INCR with expiry on first hit — returns new count or null if Redis unavailable. */
export async function redisIncr(
  key: string,
  windowSec: number
): Promise<number | null> {
  const count = await redisCommand<number>(["INCR", key]);
  if (count === null) return null;
  if (count === 1) {
    await redisCommand(["EXPIRE", key, windowSec]);
  }
  return count;
}

/** Ping Redis; returns false if unset or unreachable. */
export async function redisPing(): Promise<boolean> {
  if (!redisEnabled()) return false;
  const result = await redisCommand<string>(["PING"]);
  return result === "PONG";
}
