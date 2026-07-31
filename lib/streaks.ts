import { createClient } from "@/lib/supabase/server";
import { isDbContentEnabled } from "@/lib/content/source";
import {
  FALLBACK_TIMEZONE,
  advanceStreak,
  isValidTimezone,
  localDayString,
} from "@/lib/practice-streaks";

// Day math lives in lib/practice-streaks.ts (shared with sadhana streaks);
// re-exported here so existing imports keep working.
export { isValidTimezone, localDayString } from "@/lib/practice-streaks";

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

/** Shared with lib/sadhana.ts so both streak families resolve days identically. */
export async function resolveUserTimezone(
  userId: string,
  timezone?: string
): Promise<string> {
  const supabase = await createClient();
  return resolveTimezone(supabase, userId, timezone);
}

export async function recordVisit(
  userId: string,
  timezone?: string
): Promise<{
  current: number;
  longest: number;
  graceUsedToday?: boolean;
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

  const next = advanceStreak(
    {
      current: existing.current_streak,
      longest: existing.longest_streak,
      lastDay: existing.last_visit_date as string | null,
      graceUsedOn: (existing.grace_used_on as string | null) ?? null,
    },
    today
  );

  if (!next.changed) {
    return {
      current: existing.current_streak,
      longest: existing.longest_streak,
    };
  }

  await supabase
    .from("user_streaks")
    .update({
      current_streak: next.current,
      longest_streak: next.longest,
      last_visit_date: next.lastDay,
      grace_used_on: next.graceUsedOn,
    })
    .eq("user_id", userId);

  return {
    current: next.current,
    longest: next.longest,
    ...(next.graceConsumed ? { graceUsedToday: true } : {}),
  };
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
