import {
  advanceStreak,
  dayDiff,
  type StreakState,
} from "@/lib/practice-streaks";

/**
 * Pure core of the sadhana log (eng review T7): validation and streak math
 * with no supabase, no next/headers — importable from tests and any runtime.
 * lib/sadhana.ts re-exports the shared names so existing imports stand,
 * the same split lib/events.ts / lib/events-names.ts uses.
 */
export const PRACTICES = ["flow", "japa", "sit", "pranayama"] as const;
export type Practice = (typeof PRACTICES)[number];

export function isPractice(value: unknown): value is Practice {
  return (
    typeof value === "string" && (PRACTICES as readonly string[]).includes(value)
  );
}

/** Merge replay cap — oldest sessions beyond it are dropped, documented. */
export const MERGE_CAP = 200;

export const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
export const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clampInt(
  value: unknown,
  min: number,
  max: number
): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export type GuestSessionRow = {
  user_id: string;
  practice: Practice;
  occurred_on: string;
  duration_sec: number | null;
  count: number | null;
  details: null;
  client_ref: string;
};

/**
 * Turns an untrusted guest-log payload into insertable rows. Drops (never
 * throws on) malformed entries: unknown practices, future or shapeless days,
 * missing/invalid client uuids. Applies MERGE_CAP first, so the cap counts
 * received entries exactly like the route reports it.
 */
export function sanitizeGuestSessions(
  sessions: unknown,
  userId: string,
  today: string
): GuestSessionRow[] {
  return (Array.isArray(sessions) ? sessions : [])
    .slice(0, MERGE_CAP)
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const s = raw as Record<string, unknown>;
      if (!isPractice(s.practice)) return [];
      const occurredOn =
        typeof s.occurredOn === "string" &&
        DAY_SHAPE.test(s.occurredOn) &&
        dayDiff(s.occurredOn, today) >= 0
          ? s.occurredOn
          : null;
      if (!occurredOn) return [];
      if (typeof s.clientRef !== "string" || !UUID_SHAPE.test(s.clientRef)) {
        return [];
      }
      return [
        {
          user_id: userId,
          practice: s.practice,
          occurred_on: occurredOn,
          duration_sec: clampInt(s.durationSec, 0, 86_400),
          count: clampInt(s.count, 0, 100_000),
          details: null,
          client_ref: s.clientRef,
        },
      ];
    });
}

/**
 * Folds a practice's full day history through advanceStreak from scratch —
 * the recompute path after a merge grows the past. Sorts and dedupes
 * internally so callers can pass raw query rows.
 */
export function foldStreakDays(days: string[]): StreakState {
  const ordered = Array.from(new Set(days)).sort();
  let state: StreakState = {
    current: 0,
    longest: 0,
    lastDay: null,
    graceUsedOn: null,
  };
  for (const day of ordered) {
    state = advanceStreak(state, day);
  }
  return state;
}
