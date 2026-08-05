import { NextRequest, NextResponse } from "next/server";
import {
  loadProgressSummary,
  type ProgressRange,
} from "@/lib/progress-summary";
import { computeSeekerPath } from "@/lib/seeker-path";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getAuthUserId } from "@/lib/supabase/server";

function parseRange(raw: string | null): ProgressRange {
  if (raw === "daily" || raw === "weekly" || raw === "monthly" || raw === "yearly") {
    return raw;
  }
  return "monthly";
}

/**
 * GET /api/account/progress-summary?range=monthly
 */
export async function GET(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const range = parseRange(request.nextUrl.searchParams.get("range"));
  const supabase = await createClient();
  const summary = await loadProgressSummary(supabase, userId, range);
  const seeker = computeSeekerPath({
    visitLongestStreak: summary.visitStreak.longest,
    practiceLongestStreak: summary.practiceStreakLongest,
    meditationDays: summary.meditationDays,
    malaCount: summary.malaCount,
    versesRead: summary.versesCompleted,
  });

  return NextResponse.json({ ...summary, seeker });
}
