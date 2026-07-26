import { NextResponse } from "next/server";
import { healthSunLongitude } from "@/lib/astrology/engine";
import { getEphemerisStatus } from "@/lib/astrology/swe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ephemeris health.
 *
 * healthSunLongitude() already returned the mode as a bare string, but it also
 * hardcodes `ok: true` — so a Moshier downgrade produced a 200 with a cheerful
 * ok flag, and no monitor could ever fail on it. The mode was technically
 * visible and practically unactionable.
 *
 * Now `ok` is derived from the mode and the response carries the full status
 * (reason, resolved path, whether files were found, runtime downgrade count),
 * and a non-Swiss mode returns 503 so this is machine-checkable.
 *
 * Verify against PRODUCTION, not locally: the .se1 files are resolved at runtime
 * via process.cwd(), so a local pass proves nothing about the deployed Lambda.
 */
export async function GET() {
  try {
    // Spread first: healthSunLongitude returns its own `ok` (hardcoded true) and
    // a bare `ephemeris` string. Both are deliberately superseded below.
    const result = healthSunLongitude();
    const ephemeris = getEphemerisStatus();
    const ok = ephemeris.mode === "swiss";
    return NextResponse.json(
      {
        ...result,
        sweph: true,
        ok,
        ephemeris,
      },
      { status: ok ? 200 : 503 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "sweph failed";
    console.error("[astrology/health]", message);
    return NextResponse.json(
      { ok: false, sweph: false, error: message },
      { status: 500 }
    );
  }
}
