import { NextRequest, NextResponse } from "next/server";
import { computeDailyPanchang } from "@/lib/astrology/daily-panchang";
import { resolveIanaTz } from "@/lib/astrology/geo";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { redisGet, redisSet } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public daily panchang. Location defaults to New Delhi — a shared reference
 * sky beats a broken empty state when no location is given. Heavily cached
 * (per day + rounded location) because the computation is deterministic and
 * carrier NAT makes tight IP limits harmful.
 */
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;
const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_TTL_SEC = 6 * 3600;

function parseCoord(value: string | null, min: number, max: number): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function GET(request: NextRequest) {
  const rl = await rateLimit(`panchang:${clientKey(request)}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const params = request.nextUrl.searchParams;
  const lat = parseCoord(params.get("lat"), -66, 66) ?? DEFAULT_LAT;
  const lng = parseCoord(params.get("lng"), -180, 180) ?? DEFAULT_LNG;
  const ianaTz = resolveIanaTz(lat, lng);

  const dateParam = params.get("date");
  const date =
    dateParam && DAY_SHAPE.test(dateParam)
      ? dateParam
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: ianaTz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

  // ~11 km rounding: sunrise shifts well under a minute inside a bucket.
  const cacheKey = `panchang:${date}:${lat.toFixed(1)}:${lng.toFixed(1)}`;

  try {
    const cached = await redisGet(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached), {
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    }

    const panchang = computeDailyPanchang(date, lat, lng, ianaTz);
    await redisSet(cacheKey, JSON.stringify(panchang), CACHE_TTL_SEC);

    return NextResponse.json(panchang, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Panchang failed";
    console.error("[panchang]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
