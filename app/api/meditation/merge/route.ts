import { NextRequest, NextResponse } from "next/server";
import { mergeGuestMeditation } from "@/lib/meditation-progress";
import { isValidTimezone } from "@/lib/practice-streaks";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { requireSupabase } from "@/lib/supabase/require";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/meditation/merge — replay guest completions after sign-in. */
export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `meditation:merge:${principalKey(userId, request)}`,
    20,
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
  const completions = Array.isArray(body?.completions) ? body.completions : [];
  const result = await mergeGuestMeditation(
    userId,
    completions,
    isValidTimezone(body?.timezone) ? body.timezone : undefined
  );
  return NextResponse.json({ ok: true, ...result });
}
