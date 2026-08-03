/**
 * Aggregate practice stats for progress / achievements / seeker path.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementProgressInput } from "@/lib/achievements";
import type { SeekerPathInput } from "@/lib/seeker-path";

export type ProgressRange = "daily" | "weekly" | "monthly" | "yearly";

export type ProgressSummary = {
  range: ProgressRange;
  sessions: number;
  durationMinutes: number;
  mantras: number;
  versesCompleted: number;
  journalEntries: number;
  distribution: {
    meditation: number;
    japa: number;
    reading: number;
    other: number;
  };
  visitStreak: { current: number; longest: number };
  practiceStreakLongest: number;
  meditationDays: number;
  malaCount: number;
  pathsCompleted: number;
  chartsCast: number;
  madhavSessions: number;
};

function rangeStart(range: ProgressRange): Date {
  const now = new Date();
  const d = new Date(now);
  if (range === "daily") {
    d.setUTCHours(0, 0, 0, 0);
  } else if (range === "weekly") {
    d.setUTCDate(d.getUTCDate() - 7);
  } else if (range === "monthly") {
    d.setUTCDate(d.getUTCDate() - 30);
  } else {
    d.setUTCDate(d.getUTCDate() - 365);
  }
  return d;
}

export async function loadAchievementStats(
  supabase: SupabaseClient,
  userId: string
): Promise<AchievementProgressInput & SeekerPathInput> {
  const [
    streakRes,
    sadhanaStreakRes,
    japaRes,
    meditationRes,
    pathsRes,
    journalRes,
    chartsRes,
    madhavRes,
    versesRes,
  ] = await Promise.all([
    supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("sadhana_streaks")
      .select("longest_streak")
      .eq("user_id", userId),
    supabase
      .from("sadhana_sessions")
      .select("count")
      .eq("user_id", userId)
      .eq("practice", "japa"),
    supabase
      .from("meditation_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("journey_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("completed_at", "is", null),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("astrology_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("verse_completions")
      .select("sloka_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const practiceLongest = Math.max(
    0,
    ...((sadhanaStreakRes.data ?? []).map((r) => r.longest_streak ?? 0) as number[])
  );
  const japaBeads = (japaRes.data ?? []).reduce(
    (sum, row) => sum + (typeof row.count === "number" ? row.count : 0),
    0
  );
  const malaCount = Math.floor(japaBeads / 108);

  return {
    visitLongestStreak: streakRes.data?.longest_streak ?? 0,
    practiceLongestStreak: practiceLongest,
    malaCount,
    meditationDays: meditationRes.count ?? 0,
    pathsCompleted: pathsRes.count ?? 0,
    journalDaysOrEntries: journalRes.count ?? 0,
    chartsCast: chartsRes.count ?? 0,
    madhavSessions: madhavRes.count ?? 0,
    versesRead: versesRes.count ?? 0,
  };
}

export async function loadProgressSummary(
  supabase: SupabaseClient,
  userId: string,
  range: ProgressRange
): Promise<ProgressSummary> {
  const stats = await loadAchievementStats(supabase, userId);
  const since = rangeStart(range).toISOString();

  const [sadhanaRes, meditationRes, versesRes, journalRes, streakRes] =
    await Promise.all([
      supabase
        .from("sadhana_sessions")
        .select("practice, count, duration_seconds")
        .eq("user_id", userId)
        .gte("created_at", since),
      supabase
        .from("meditation_completions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("completed_at", since),
      supabase
        .from("verse_completions")
        .select("sloka_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("completed_at", since),
      supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since),
      supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  let durationMinutes = 0;
  let mantras = 0;
  let japaSessions = 0;
  let otherSessions = 0;
  for (const row of sadhanaRes.data ?? []) {
    if (row.practice === "japa") {
      japaSessions += 1;
      mantras += typeof row.count === "number" ? row.count : 0;
    } else {
      otherSessions += 1;
    }
    if (typeof row.duration_seconds === "number") {
      durationMinutes += Math.round(row.duration_seconds / 60);
    }
  }

  const meditationSessions = meditationRes.count ?? 0;
  const reading = versesRes.count ?? 0;
  const sessions = japaSessions + otherSessions + meditationSessions;

  const distTotal =
    meditationSessions + japaSessions + reading + otherSessions || 1;

  return {
    range,
    sessions,
    durationMinutes,
    mantras,
    versesCompleted: reading,
    journalEntries: journalRes.count ?? 0,
    distribution: {
      meditation: Math.round((meditationSessions / distTotal) * 100),
      japa: Math.round((japaSessions / distTotal) * 100),
      reading: Math.round((reading / distTotal) * 100),
      other: Math.round((otherSessions / distTotal) * 100),
    },
    visitStreak: {
      current: streakRes.data?.current_streak ?? 0,
      longest: streakRes.data?.longest_streak ?? 0,
    },
    practiceStreakLongest: stats.practiceLongestStreak,
    meditationDays: stats.meditationDays,
    malaCount: stats.malaCount,
    pathsCompleted: stats.pathsCompleted,
    chartsCast: stats.chartsCast,
    madhavSessions: stats.madhavSessions,
  };
}
