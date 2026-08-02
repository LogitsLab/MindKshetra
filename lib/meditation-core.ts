/**
 * Pure meditation helpers — safe for client and server (no fs).
 */

export type MeditationPhase =
  | { type: "speak"; text_en: string; text_hi: string }
  | { type: "silence"; seconds: number };

export type MeditationSession = {
  id: string;
  day_number: number;
  tier: "foundation" | "habit" | "goal" | "daily";
  track: "anxiety" | "sleep" | "focus" | "stress" | null;
  unlock_rule: "previous_completed" | "always";
  audio_url: string | null;
  duration_minutes: number;
  title_en: string;
  title_hi: string;
  theme_en: string;
  theme_hi: string;
  phases: MeditationPhase[];
  transcript_en?: string;
  transcript_hi?: string;
};

export type MeditationProgram = {
  id: string;
  days_count: number;
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  days: MeditationSession[];
};

export type DailySitsCatalog = {
  id: string;
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  sessions: MeditationSession[];
};

export const FOUNDATION_PROGRAM_ID = "foundation-7";

export function sessionTranscript(
  session: MeditationSession,
  lang: "en" | "hi"
): string {
  if (lang === "hi" && session.transcript_hi) return session.transcript_hi;
  if (lang === "en" && session.transcript_en) return session.transcript_en;
  return session.phases
    .filter(
      (p): p is Extract<MeditationPhase, { type: "speak" }> => p.type === "speak"
    )
    .map((p) => (lang === "hi" ? p.text_hi : p.text_en))
    .join("\n\n");
}

/** Day N is unlocked if N===1 or day N-1 is in completedDays. */
export function isDayUnlocked(
  day: number,
  completedDays: number[],
  daysCount: number
): boolean {
  if (!Number.isInteger(day) || day < 1 || day > daysCount) return false;
  if (day === 1) return true;
  return completedDays.includes(day - 1);
}

export function nextUnlockedDay(
  completedDays: number[],
  daysCount: number
): number {
  const completed = new Set(completedDays);
  for (let d = 1; d <= daysCount; d++) {
    if (!completed.has(d) && isDayUnlocked(d, completedDays, daysCount)) {
      return d;
    }
  }
  return Math.min(daysCount, Math.max(1, ...(completedDays.length ? completedDays : [0])) + 1);
}
