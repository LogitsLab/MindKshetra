import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/**
 * Festival reminder fan-out (plan Phase 3).
 *
 * TODO: When the push dispatcher gains a `festival_reminder` kind (and/or
 * email twin of votd-email), resolve today's named festivals via
 * `festivalsForDailyPanchang` / `computeMonthPanchang` for the Delhi
 * reference sky and notify opted-in users. Until then this is an
 * authorized no-op so schedules and secrets can be wired safely.
 *
 * Suggested schedule (IST morning): mirror votd-email — "30 2 * * *" UTC.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No-op stub — push/email dispatcher not live for festivals yet.
  return NextResponse.json({ ok: true, sent: 0 });
}
