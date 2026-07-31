import { NextRequest, NextResponse } from "next/server";
import { computeMonthPanchang } from "@/lib/astrology/festivals";
import { resolveIanaTz } from "@/lib/astrology/geo";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { redisGet, redisSet } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A month walks ~30 daily panchangs through the ephemeris; give it room on
// a cold cache.
export const maxDuration = 60;

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;
const MONTH_SHAPE = /^\d{4}-(0[1-9]|1[0-2])$/;
const CACHE_TTL_SEC = 7 * 24 * 3600;

function parseCoord(value: string | null, min: number, max: number): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function GET(request: NextRequest) {
  // Tighter than the daily route: a cold month is real compute.
  const rl = await rateLimit(`panchang:cal:${clientKey(request)}`, 10, 60_000);
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

  const monthParam = params.get("month");
  const month =
    monthParam && MONTH_SHAPE.test(monthParam)
      ? monthParam
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: ianaTz,
          year: "numeric",
          month: "2-digit",
        })
          .format(new Date())
          .slice(0, 7);

  const cacheKey = `panchang:cal:${month}:${lat.toFixed(1)}:${lng.toFixed(1)}`;

  try {
    const cached = await redisGet(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached), {
        headers: { "Cache-Control": "public, max-age=21600" },
      });
    }

    const calendar = computeMonthPanchang(month, lat, lng, ianaTz);
    await redisSet(cacheKey, JSON.stringify(calendar), CACHE_TTL_SEC);

    return NextResponse.json(calendar, {
      headers: { "Cache-Control": "public, max-age=21600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar failed";
    console.error("[panchang/calendar]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
