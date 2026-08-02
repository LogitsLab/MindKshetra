import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/events";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import {
  getSadhanaSummary,
  isPractice,
  logSadhanaSession,
} from "@/lib/sadhana";
import { isValidTimezone } from "@/lib/practice-streaks";
import { requireSupabase } from "@/lib/supabase/require";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Practice log. Anonymous Supabase users persist too (guest-first — an
 * anonymous id survives the upgrade to a full account, so nothing is lost);
 * device-only guests log locally and replay via /api/sadhana/merge.
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ today: null, doneToday: [], streaks: [] });
  }
  const timezone = request.nextUrl.searchParams.get("tz") ?? undefined;
  const summary = await getSadhanaSummary(
    userId,
    isValidTimezone(timezone) ? timezone : undefined
  );
  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `sadhana:${principalKey(userId, request)}`,
    60,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !isPractice(body.practice)) {
    return NextResponse.json({ error: "Unknown practice" }, { status: 400 });
  }

  try {
    const result = await logSadhanaSession(
      userId,
      {
        practice: body.practice,
        occurredOn:
          typeof body.occurredOn === "string" ? body.occurredOn : undefined,
        durationSec: body.durationSec,
        count: body.count,
        details:
          body.details &&
          typeof body.details === "object" &&
          !Array.isArray(body.details)
            ? (body.details as Record<string, unknown>)
            : undefined,
        clientRef:
          typeof body.clientRef === "string" ? body.clientRef : undefined,
      },
      isValidTimezone(body.timezone) ? body.timezone : undefined
    );
    await recordEvent("sadhana_logged", userId, { practice: body.practice });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Log failed";
    console.error("[sadhana]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
