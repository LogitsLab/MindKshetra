import { NextResponse } from "next/server";
import { evaluateAchievements } from "@/lib/achievements";
import { loadAchievementStats } from "@/lib/progress-summary";
import { computeSeekerPath } from "@/lib/seeker-path";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getAuthUserId } from "@/lib/supabase/server";

/**
 * GET /api/account/achievements
 * Evaluates catalog against live stats; upserts unlocked rows.
 */
export async function GET() {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const stats = await loadAchievementStats(supabase, userId);
  const evaluated = evaluateAchievements(stats);
  const seeker = computeSeekerPath(stats);

  const { data: stored } = await supabase
    .from("user_achievements")
    .select("achievement_id, progress, unlocked_at")
    .eq("user_id", userId);

  const unlockedAt = new Map(
    (stored ?? []).map((r) => [r.achievement_id, r.unlocked_at as string | null])
  );

  const now = new Date().toISOString();
  const upserts = evaluated.map((a) => ({
    user_id: userId,
    achievement_id: a.id,
    progress: a.progress,
    unlocked_at: a.unlocked
      ? unlockedAt.get(a.id) || now
      : unlockedAt.get(a.id) || null,
    updated_at: now,
  }));

  if (upserts.length) {
    const { error } = await supabase.from("user_achievements").upsert(upserts, {
      onConflict: "user_id,achievement_id",
    });
    if (error) {
      console.warn("[achievements] upsert", error.message);
    }
  }

  return NextResponse.json({
    seeker: {
      rankKey: seeker.rankKey,
      level: seeker.level,
      labelEn: seeker.labelEn,
      labelHi: seeker.labelHi,
    },
    achievements: evaluated.map((a) => ({
      id: a.id,
      progress: a.progress,
      target: a.target,
      unlocked: a.unlocked,
      unlockedAt: unlockedAt.get(a.id) ?? null,
      motif: a.def.motif,
      nameEn: a.def.en.name,
      nameHi: a.def.hi.name,
      lineEn: a.def.en.line,
      lineHi: a.def.hi.line,
    })),
    stats,
  });
}
