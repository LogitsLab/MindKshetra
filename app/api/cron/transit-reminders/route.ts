import { NextRequest, NextResponse } from "next/server";

/**
 * Weekly transit → practice reminder cron (roadmap Phase 6).
 *
 * Auth-gated no-op until:
 * 1. A `transit_reminder` notification pref column + push kind ship
 * 2. Cohort selection can resolve opted-in users with a saved self chart
 * 3. Copy is reviewed (companionship, never causation — same as Pressure→Practice)
 *
 * Returns the same shape as festival-reminders so ops dashboards stay uniform.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: selectDueTransitCandidates → push dispatcher with verse + sit CTA.
  return NextResponse.json({ ok: true, sent: 0, stub: true });
}
