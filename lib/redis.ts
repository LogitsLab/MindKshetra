/**
 * Optional Upstash Redis REST helpers.
 * When UPSTASH_REDIS_REST_URL + TOKEN are unset, callers fall back to memory.
 */

const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

export function redisEnabled(): boolean {
  return Boolean(url && token);
}

async function redisCommand<T = unknown>(
  command: (string | number)[]
): Promise<T | null> {
  if (!url || !token) return null;
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
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return (data.result ?? null) as T | null;
  } catch {
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
