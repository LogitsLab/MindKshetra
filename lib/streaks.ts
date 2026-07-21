import { createClient } from "@/lib/supabase/server";
import { isDbContentEnabled } from "@/lib/content/source";

export async function recordVisit(userId: string): Promise<{
  current: number;
  longest: number;
}> {
  if (!isDbContentEnabled()) return { current: 0, longest: 0 };

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

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

  const last = new Date(existing.last_visit_date as string);
  const now = new Date(today);
  const diffDays = Math.round(
    (now.getTime() - last.getTime()) / 86_400_000
  );
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
