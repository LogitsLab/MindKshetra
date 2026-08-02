import type { MeditationSession } from "@/lib/meditation-core";

/**
 * The unified journey model. Pure — safe on both sides, no fs, no supabase.
 *
 * A journey is a container of days; days differ by KIND, not by engine. Before
 * this module the product ran two engines for one job: themed paths (scripture
 * days, verse links, a sādhana round trip, every day open) and the meditation
 * course (guided sessions, unlock chaining, mood check-ins, guest merge). Each
 * had what the other lacked, and the shared arithmetic existed in five copies.
 * Journeys keep both day kinds and give both sides the whole feature set.
 */

export type JourneyKind = "scripture" | "meditation";

/**
 * "chain" gates day N behind day N-1 (the meditation course's rule, and what a
 * 21-day arc needs to mean anything). "open" leaves every day reachable — the
 * 7-day themed paths shipped that way and people use them as a menu.
 */
export type JourneyUnlock = "chain" | "open";

export type JourneyPractice =
  | "sit"
  | "japa"
  | "pranayama"
  | "flow"
  | "meditation";

export type ScriptureDay = {
  day: number;
  kind: "scripture";
  ref: { chapter: number; verse: number };
  practice: JourneyPractice;
  minutes: number;
  title_en: string;
  title_hi: string;
  prompt_en: string;
  prompt_hi: string;
};

export type MeditationDay = {
  day: number;
  kind: "meditation";
  practice: "meditation";
  minutes: number;
  title_en: string;
  title_hi: string;
  /** The guided session; phases drive the player. */
  session: MeditationSession;
  /** Optional verse companion — meditation days had no scripture link before. */
  ref?: { chapter: number; verse: number };
};

export type JourneyDay = ScriptureDay | MeditationDay;

export type Journey = {
  id: string;
  kind: JourneyKind;
  unlock: JourneyUnlock;
  days_count: number;
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  days: JourneyDay[];
};

export type JourneyRun = {
  journeyId: string;
  currentDay: number;
  completedDays: number[];
  guest: boolean;
};

export const JOURNEY_ID_SHAPE = /^[a-z0-9-]+$/i;

/** Day 1 is always open. After that, "open" journeys never gate. */
export function isDayUnlocked(
  day: number,
  completedDays: number[],
  daysCount: number,
  unlock: JourneyUnlock = "chain"
): boolean {
  if (!Number.isInteger(day) || day < 1 || day > daysCount) return false;
  if (unlock === "open" || day === 1) return true;
  return completedDays.includes(day - 1);
}

/**
 * The day to offer next: the first incomplete unlocked day, else the day after
 * the furthest completed one, clamped. Replaces five near-identical copies of
 * `Math.min(days_count, (last ?? 0) + 1)` across the clients and both routes.
 */
export function nextDayFrom(
  completedDays: number[],
  daysCount: number,
  unlock: JourneyUnlock = "chain"
): number {
  if (daysCount < 1) return 1;
  const completed = new Set(completedDays);
  for (let d = 1; d <= daysCount; d++) {
    if (!completed.has(d) && isDayUnlocked(d, completedDays, daysCount, unlock)) {
      return d;
    }
  }
  const furthest = completedDays.length ? Math.max(...completedDays) : 0;
  return Math.min(daysCount, furthest + 1);
}

/** Advance a run by one completed day. Pure: the routes persist the result. */
export function advanceRun(
  completedDays: number[],
  currentDay: number,
  day: number,
  daysCount: number,
  unlock: JourneyUnlock = "chain"
): { completedDays: number[]; currentDay: number } {
  const next = Array.from(new Set([...completedDays, day]))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= daysCount)
    .sort((a, b) => a - b);
  return {
    completedDays: next,
    // Never walk a run backwards: a re-marked earlier day keeps the cursor.
    currentDay: Math.max(currentDay, nextDayFrom(next, daysCount, unlock)),
  };
}

export function isJourneyComplete(
  completedDays: number[],
  daysCount: number
): boolean {
  if (daysCount < 1) return false;
  const completed = new Set(completedDays);
  for (let d = 1; d <= daysCount; d++) if (!completed.has(d)) return false;
  return true;
}

/** Sanitize untrusted completed-day arrays (guest payloads, stale storage). */
export function normalizeDays(value: unknown, daysCount: number): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (d): d is number =>
          typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= daysCount
      )
    )
  ).sort((a, b) => a - b);
}

export function journeyDay(journey: Journey, day: number): JourneyDay | null {
  return journey.days.find((d) => d.day === day) ?? null;
}

/**
 * The longest run of days a replayed guest log could legitimately have earned.
 *
 * A merge used to accept whatever array the client sent, so one request could
 * complete a 21-day chained arc without a day of practice. Chained journeys
 * now keep only the unbroken prefix from day 1; open journeys keep everything,
 * because every day was always reachable there anyway.
 */
export function claimableDays(
  completedDays: number[],
  daysCount: number,
  unlock: JourneyUnlock = "chain"
): number[] {
  const days = normalizeDays(completedDays, daysCount);
  if (unlock === "open") return days;
  const set = new Set(days);
  const out: number[] = [];
  for (let d = 1; d <= daysCount; d++) {
    if (!set.has(d)) break;
    out.push(d);
  }
  return out;
}
