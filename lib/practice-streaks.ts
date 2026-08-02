/**
 * Pure day-boundary and streak math, shared by the visit streak
 * (lib/streaks.ts / user_streaks) and per-practice sadhana streaks
 * (lib/sadhana.ts / sadhana_streaks). No I/O here — everything is unit-testable
 * with plain values.
 */

/**
 * Most of the audience is in India; before migration 010 every streak was
 * computed against UTC, which flips the day at 05:30 IST. Users without a
 * stored timezone keep IST semantics rather than reverting to UTC.
 */
export const FALLBACK_TIMEZONE = "Asia/Kolkata";

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

export function dayDiff(fromDay: string, toDay: string): number {
  // Both are calendar dates; comparing them at UTC midnight is exact.
  return Math.round(
    (new Date(`${toDay}T00:00:00Z`).getTime() -
      new Date(`${fromDay}T00:00:00Z`).getTime()) /
      86_400_000
  );
}

export type StreakState = {
  current: number;
  longest: number;
  lastDay: string | null;
  graceUsedOn: string | null;
};

export type StreakAdvance = StreakState & {
  /** False when today was already recorded (nothing to write). */
  changed: boolean;
  /** True when the rest-day mechanic absorbed a one-day gap. */
  graceConsumed: boolean;
};

/**
 * Grace ("rest day") per migration 010: a gap of exactly two local days —
 * i.e. one missed day — consumes one grace instead of resetting the streak.
 * At most one grace per rolling week, so a practice can breathe without the
 * streak losing its meaning.
 */
const GRACE_COOLDOWN_DAYS = 7;

export function advanceStreak(state: StreakState, today: string): StreakAdvance {
  if (!state.lastDay) {
    return {
      current: 1,
      longest: Math.max(1, state.longest),
      lastDay: today,
      graceUsedOn: state.graceUsedOn,
      changed: true,
      graceConsumed: false,
    };
  }

  const diff = dayDiff(state.lastDay, today);
  // diff < 1 covers "already today" plus clock/timezone skew around the
  // one-time UTC→local-day migration; treat both as already recorded.
  if (diff < 1) {
    return { ...state, changed: false, graceConsumed: false };
  }

  let current: number;
  let graceUsedOn = state.graceUsedOn;
  let graceConsumed = false;

  if (diff === 1) {
    current = state.current + 1;
  } else if (diff === 2 && graceAvailable(state.graceUsedOn, today)) {
    current = state.current + 1;
    graceUsedOn = today;
    graceConsumed = true;
  } else {
    current = 1;
  }

  return {
    current,
    longest: Math.max(state.longest, current),
    lastDay: today,
    graceUsedOn,
    changed: true,
    graceConsumed,
  };
}

function graceAvailable(graceUsedOn: string | null, today: string): boolean {
  if (!graceUsedOn) return true;
  return dayDiff(graceUsedOn, today) >= GRACE_COOLDOWN_DAYS;
}
