import { NextRequest, NextResponse } from "next/server";
import { completeMeditationSession } from "@/lib/meditation-progress";
import { isValidTimezone } from "@/lib/practice-streaks";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { requireSupabase } from "@/lib/supabase/require";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/meditation/complete */
export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `meditation:complete:${principalKey(userId, request)}`,
    40,
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
  if (!body || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const result = await completeMeditationSession(userId, {
      sessionId: body.sessionId,
      moodBefore: body.moodBefore,
      moodAfter: body.moodAfter,
      durationSec: body.durationSec,
      clientRef:
        typeof body.clientRef === "string" ? body.clientRef : undefined,
      timezone: isValidTimezone(body.timezone) ? body.timezone : undefined,
    });
    return NextResponse.json({
      ok: true,
      progress: result.progress,
      streak: result.streak,
      sessionId: result.session.id,
      milestone: result.milestone,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message === "Session not found"
        ? 404
        : message === "Day is locked"
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
