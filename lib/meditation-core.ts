/**
 * Pure meditation helpers — safe for client and server (no fs).
 */

export type MeditationPhase =
  | { type: "speak"; text_en: string; text_hi: string }
  | { type: "silence"; seconds: number };

export type MeditationTier =
  | "foundation"
  | "habit"
  | "deepening"
  | "goal"
  | "daily";

export type MeditationSession = {
  id: string;
  day_number: number;
  tier: MeditationTier;
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

/** Legacy segment id (days 1–7). Progress migrates into the sitting course. */
export const FOUNDATION_PROGRAM_ID = "foundation-7";

/**
 * One progressive sit arc: foundation (1–7) + habit (8–21) + deepening (22–45).
 * Progress lives on journey_runs under this id.
 */
export const SITTING_COURSE_ID = "sitting-course";

/** Segment file ids that compose into sitting-course (not listed alone). */
export const SITTING_SEGMENT_IDS = [
  "foundation-7",
  "meditation-21",
  "meditation-45",
] as const;

/** Private milestones on the sitting arc (no public leaderboards). */
export const SITTING_MILESTONES = [7, 21, 45] as const;

export type SittingMilestone = (typeof SITTING_MILESTONES)[number];

/** Section labels for hub grouping. */
export function sittingSectionForDay(day: number): {
  id: "foundation" | "habit" | "deepening";
  end: SittingMilestone;
} {
  if (day <= 7) return { id: "foundation", end: 7 };
  if (day <= 21) return { id: "habit", end: 21 };
  return { id: "deepening", end: 45 };
}

export function milestoneJustHit(
  completedDays: number[],
  dayJustCompleted: number
): SittingMilestone | null {
  if (!(SITTING_MILESTONES as readonly number[]).includes(dayJustCompleted)) {
    return null;
  }
  const m = dayJustCompleted as SittingMilestone;
  for (let d = 1; d <= m; d++) {
    if (!completedDays.includes(d) && d !== dayJustCompleted) return null;
  }
  return m;
}

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
