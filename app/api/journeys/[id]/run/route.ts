import { NextRequest, NextResponse } from "next/server";
import { loadJourney } from "@/lib/journeys/content";
import { isDayUnlocked, journeyDay } from "@/lib/journeys/core";
import { getJourneyRun, markJourneyDay } from "@/lib/journeys/progress";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { requireSupabase } from "@/lib/supabase/require";
import { getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/journeys/[id]/run — progress for the signed-in user, else guest. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const journey = loadJourney(id);
  if (!journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({
      journeyId: id,
      currentDay: 1,
      completedDays: [] as number[],
      guest: true,
    });
  }

  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  try {
    return NextResponse.json(await getJourneyRun(userId, journey));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Progress unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/journeys/[id]/run — mark one day complete. */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const journey = loadJourney(id);
  if (!journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `journeys:mark:${principalKey(userId, request)}`,
    40,
    60_000
  );
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to save journey progress" },
      { status: 401 }
    );
  }

  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  const body = await request.json().catch(() => null);
  const day = Number((body as { day?: unknown } | null)?.day);
  // days_count describes the arc; a file may not define every day of it
  // (meditation-21 declares 21 and ships 8-21). An undefined day must not
  // count, or it becomes a free step through a chained journey.
  if (
    !Number.isInteger(day) ||
    day < 1 ||
    day > journey.days_count ||
    !journeyDay(journey, day)
  ) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  try {
    // Server-side unlock enforcement — the meditation course gated only in the
    // client, so a crafted request could complete day 7 on day one.
    const existing = await getJourneyRun(userId, journey);
    if (
      !isDayUnlocked(
        day,
        existing.completedDays,
        journey.days_count,
        journey.unlock
      )
    ) {
      return NextResponse.json({ error: "Day is locked" }, { status: 409 });
    }
    return NextResponse.json(await markJourneyDay(userId, journey, day));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
