import { NextResponse } from "next/server";
import {
  milestonesFor,
  nextMilestone,
  type MilestonePractice,
  type MilestoneStats,
} from "@/lib/milestones";
import { PRACTICES } from "@/lib/sadhana-core";
import { listPracticePaths } from "@/lib/paths";
import { getAllSlokas } from "@/lib/slokas";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account/milestones — the quiet-milestones aggregate, private to
 * its own user (anonymous sessions included: their practice rows are as real
 * as anyone's). Everything is computed from tables that already exist —
 * user_streaks, sadhana_streaks, sadhana_sessions, verse_completions,
 * path_runs — through the pure ladder in lib/milestones.ts.
 *
 * Fail-soft: signed-out callers get { guest: true } and compute locally;
 * individual read failures degrade to empty slices of the stats rather than
 * failing the panel — marks are display, never a source of truth.
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ guest: true });
  }

  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  const supabase = await createClient();
  const [visitRes, practiceRes, japaRes, versesRes, runsRes, slokas] =
    await Promise.all([
      supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("sadhana_streaks")
        .select("practice, longest_streak")
        .eq("user_id", userId),
      supabase
        .from("sadhana_sessions")
        .select("count")
        .eq("user_id", userId)
        .eq("practice", "japa"),
      supabase
        .from("verse_completions")
        .select("sloka_id")
        .eq("user_id", userId),
      supabase
        .from("path_runs")
        .select("path_id, completed_days")
        .eq("user_id", userId),
      getAllSlokas(),
    ]);

  for (const [label, res] of [
    ["user_streaks", visitRes],
    ["sadhana_streaks", practiceRes],
    ["sadhana_sessions", japaRes],
    ["verse_completions", versesRes],
    ["path_runs", runsRes],
  ] as const) {
    if (res.error) console.error(`[milestones] ${label}:`, res.error.message);
  }

  const practiceStreakDays: Partial<Record<MilestonePractice, number>> = {};
  for (const row of practiceRes.data ?? []) {
    const practice = row.practice as string;
    if ((PRACTICES as readonly string[]).includes(practice)) {
      practiceStreakDays[practice as MilestonePractice] = Number(
        row.longest_streak ?? 0
      );
    }
  }

  const japaLifetimeCount = (japaRes.data ?? []).reduce(
    (sum, row) => sum + (Number(row.count) || 0),
    0
  );

  const completedIds = new Set(
    (versesRes.data ?? []).map((row) => Number(row.sloka_id))
  );
  const byChapter = new Map<number, { total: number; done: number }>();
  for (const sloka of slokas) {
    const entry = byChapter.get(sloka.chapter) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (completedIds.has(sloka.id)) entry.done += 1;
    byChapter.set(sloka.chapter, entry);
  }
  const chaptersCompleted = Array.from(byChapter.entries())
    .filter(([, v]) => v.total > 0 && v.done >= v.total)
    .map(([chapter]) => chapter)
    .sort((a, b) => a - b);

  const pathDefs = new Map(listPracticePaths().map((p) => [p.id, p]));
  const pathsCompleted = (runsRes.data ?? []).flatMap((run) => {
    const def = pathDefs.get(String(run.path_id));
    const doneDays = Array.isArray(run.completed_days)
      ? run.completed_days.length
      : 0;
    return def && doneDays >= def.days_count
      ? [{ id: def.id, titleEn: def.title_en, titleHi: def.title_hi }]
      : [];
  });

  const stats: MilestoneStats = {
    visitStreakDays: Number(visitRes.data?.longest_streak ?? 0),
    practiceStreakDays,
    japaLifetimeCount,
    versesRead: completedIds.size,
    chaptersCompleted,
    totalVerses: slokas.length,
    pathsCompleted,
  };

  return NextResponse.json({
    guest: false,
    milestones: milestonesFor(stats),
    next: nextMilestone(stats),
    summary: {
      visitCurrent: Number(visitRes.data?.current_streak ?? 0),
      visitLongest: Number(visitRes.data?.longest_streak ?? 0),
      versesRead: completedIds.size,
      totalVerses: slokas.length,
      japaLifetimeCount,
    },
  });
}
