import { createClient } from "@/lib/supabase/server";
import { isDbContentEnabled } from "@/lib/content/source";

/**
 * Most of the audience is in India; before migration 010 every streak was
 * computed against UTC, which flips the day at 05:30 IST. Users without a
 * stored timezone keep IST semantics rather than reverting to UTC.
 */
const FALLBACK_TIMEZONE = "Asia/Kolkata";

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** YYYY-MM-DD in the given zone ('en-CA' formats as ISO). */
export function localDayString(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayDiff(fromDay: string, toDay: string): number {
  // Both are calendar dates; comparing them at UTC midnight is exact.
  return Math.round(
    (new Date(`${toDay}T00:00:00Z`).getTime() -
      new Date(`${fromDay}T00:00:00Z`).getTime()) /
      86_400_000
  );
}

async function resolveTimezone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  timezone?: string
): Promise<string> {
  if (isValidTimezone(timezone)) return timezone;
  const { data } = await supabase
    .from("user_preferences")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();
  return isValidTimezone(data?.timezone) ? data.timezone : FALLBACK_TIMEZONE;
}

export async function recordVisit(
  userId: string,
  timezone?: string
): Promise<{
  current: number;
  longest: number;
}> {
  if (!isDbContentEnabled()) return { current: 0, longest: 0 };

  const supabase = await createClient();
  const today = localDayString(await resolveTimezone(supabase, userId, timezone));

  const { data: existing } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("user_streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_visit_date: today,
    });
    return { current: 1, longest: 1 };
  }

  if (existing.last_visit_date === today) {
    return {
      current: existing.current_streak,
      longest: existing.longest_streak,
    };
  }

  const diffDays = dayDiff(existing.last_visit_date as string, today);
  // diffDays < 1 can only happen around the one-time UTC→local-day migration
  // (or a timezone change); treat it as "already visited today".
  if (diffDays < 1) {
    return {
      current: existing.current_streak,
      longest: existing.longest_streak,
    };
  }
  const current = diffDays === 1 ? existing.current_streak + 1 : 1;
  const longest = Math.max(existing.longest_streak, current);

  await supabase
    .from("user_streaks")
    .update({
      current_streak: current,
      longest_streak: longest,
      last_visit_date: today,
    })
    .eq("user_id", userId);

  return { current, longest };
}

export async function getStreak(userId: string): Promise<{
  current: number;
  longest: number;
}> {
  if (!isDbContentEnabled()) return { current: 0, longest: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_streaks")
    .select("current_streak, longest_streak")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    current: data?.current_streak ?? 0,
    longest: data?.longest_streak ?? 0,
  };
}
