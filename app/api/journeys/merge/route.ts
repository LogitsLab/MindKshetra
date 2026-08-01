import { NextRequest, NextResponse } from "next/server";
import { mergeGuestJourneys } from "@/lib/journeys/progress";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { requireSupabase } from "@/lib/supabase/require";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/journeys/merge — replay device-local journeys on sign-in.
 * Body: { journeys: [{ journeyId, completedDays }] }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `journeys:merge:${principalKey(userId, request)}`,
    20,
    60_000
  );
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  const body = await request.json().catch(() => null);
  const journeys = (body as { journeys?: unknown } | null)?.journeys;

  try {
    const result = await mergeGuestJourneys(userId, journeys);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
