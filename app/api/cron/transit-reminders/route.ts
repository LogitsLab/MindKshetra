import { NextRequest, NextResponse } from "next/server";

/**
 * Weekly transit → practice reminder cron (roadmap Phase 6).
 *
 * Auth-gated no-op until:
 * 1. `dispatchTransitReminders` ships with real cohort + copy
 * 2. Account UIs may expose an opt-in (today `astrologyAlerts` exists in DB/API only — no live toggle)
 * 3. Copy is reviewed (companionship, never causation — same as Pressure→Practice)
 *
 * Do not surface transit / astrology alert toggles in web or mobile until this cron sends real pushes.
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
