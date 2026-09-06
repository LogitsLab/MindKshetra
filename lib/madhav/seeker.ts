import {
  GOALS,
  isGuidanceStyleId,
  sanitizeDailyTime,
  sanitizeGoals,
  type GoalId,
  type GuidanceStyleId,
} from "@/lib/personalization";
import { addressName } from "@/lib/madhav/today";

export type MadhavSeekerContext = {
  displayName: string;
  goals: GoalId[];
  guidanceStyle: GuidanceStyleId | null;
  dailyTimeMinutes: number | null;
};

/**
 * Prompt pack from onboarding prefs. Empty prefs still yield the Parth
 * address so guests and skipped onboarding do not crash the builder.
 */
export function formatSeekerPromptBlock(
  seeker: MadhavSeekerContext | null | undefined,
  lang: "en" | "hi"
): string {
  const worldName = addressName(seeker?.displayName, lang);
  const hasWorldName = Boolean(seeker?.displayName?.trim());

  const nameBlock = hasWorldName
    ? `The seeker's name in the world is ${worldName}. Address them as ${worldName} naturally — a greeting, a turning point, the last line. You may still use Parth (पार्थ), Krishna's name for Arjuna, when that intimacy lands — especially the close line. Do not force either name into every sentence. Never invent a different nickname.`
    : `The seeker's name is Parth (पार्थ). Address them as Parth the way Krishna addressed Arjuna — naturally, with care. Use the name where it lands (a greeting, a turning point, or the last line). Do not force it into every sentence.`;

  const parts: string[] = [nameBlock];

  const goalLabels = (seeker?.goals ?? [])
    .map((id) => GOALS.find((g) => g.id === id))
    .filter((g): g is (typeof GOALS)[number] => Boolean(g))
    .map((g) => (lang === "hi" ? g.hi : g.en));
  if (goalLabels.length) {
    parts.push(
      `They came for: ${goalLabels.join(", ")}. Let this color examples and the practices you offer. Do not lecture them about goals they did not name. Do not list these goals out loud.`
    );
  }

  const minutes = seeker?.dailyTimeMinutes;
  if (minutes) {
    parts.push(
      `They have about ${minutes} minutes a day. Size any sit, japa, or breath to that — a ${minutes}-minute practice, not a longer programme. Do not ask for more time than they have.`
    );
  }

  const style = seeker?.guidanceStyle;
  if (style === "practice_first") {
    parts.push(
      `They asked for practice-first guidance. Lead with one concrete thing they can do now (japa on the beads, a sit, or breath) that fits their minutes. Bring in a retrieved verse only if it changes what they should do today — not as decoration. Keep the whole reply well under 180 words. Offer one practice for today, not a week's programme.`
    );
  } else if (style === "gita_first") {
    parts.push(
      `They asked for Gita-first guidance. When a verse earns its place, lead with one retrieved verse and what it means for their situation. Before or after it, tell a short personalised story that mirrors *their* life so they can recognise themselves. Offer a practice only if it lands naturally at the end. Keep the whole reply under ~220 words.`
    );
  } else if (style === "balanced") {
    parts.push(
      `They asked for balanced guidance: a short personalised story, one Gita teaching, then one short sit, japa, or breath that fits their minutes. Keep the whole reply under ~220 words.`
    );
  }

  return parts.join("\n\n");
}

export function replyLengthLine(
  seeker: MadhavSeekerContext | null | undefined
): string {
  return seeker?.guidanceStyle === "practice_first"
    ? "Keep the whole reply well under 180 words."
    : "Keep the whole reply under ~220 words.";
}

/** Hard cap on the Madhav (non-chart) completion. Room for a story, not an essay. */
export function madhavMaxTokens(
  seeker: MadhavSeekerContext | null | undefined
): number {
  return seeker?.guidanceStyle === "practice_first" ? 480 : 700;
}

export async function loadMadhavSeeker(
  userId: string | null | undefined
): Promise<MadhavSeekerContext | null> {
  if (!userId) return null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_preferences")
      .select("display_name, goals, daily_time_minutes, guidance_style")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    const guidance =
      typeof data.guidance_style === "string" &&
      isGuidanceStyleId(data.guidance_style)
        ? data.guidance_style
        : null;
    return {
      displayName:
        typeof data.display_name === "string"
          ? data.display_name.replace(/\s+/g, " ").trim().slice(0, 80)
          : "",
      goals: sanitizeGoals(data.goals),
      dailyTimeMinutes: sanitizeDailyTime(data.daily_time_minutes),
      guidanceStyle: guidance,
    };
  } catch (err) {
    console.warn(
      "[madhav] prefs load failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}
