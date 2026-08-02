import { dayDiff, isValidTimezone, localDayString } from "@/lib/practice-streaks";

/**
 * Pure cohort selection for the push dispatcher (eng review T7): which
 * opted-in users are due a send at `now`, given their timezone and chosen
 * hours. No supabase, no fetch — the route feeds it pages and persists the
 * results; tests feed it fixtures.
 */

export const FALLBACK_TZ = "Asia/Kolkata";
export const STREAK_HOUR = 20;

export type PrefRow = {
  user_id: string;
  timezone: string | null;
  preferred_language: string | null;
  notif_daily_verse: boolean | null;
  notif_daily_verse_hour: number | null;
  notif_streak_reminder: boolean | null;
};

export type Candidate = {
  row: PrefRow;
  kind: "daily_verse" | "streak_reminder";
  day: string;
};

export function localHour(tz: string, now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
}

/**
 * daily_verse is due at the user's chosen local hour (default 8);
 * streak_reminder at 20:00 local. Invalid timezones fall back to IST —
 * a wrong-but-plausible hour beats never delivering.
 */
export function selectDueCandidates(rows: PrefRow[], now: Date): Candidate[] {
  const due: Candidate[] = [];
  for (const row of rows) {
    const tz = isValidTimezone(row.timezone) ? row.timezone! : FALLBACK_TZ;
    const hour = localHour(tz, now);
    const day = localDayString(tz, now);
    if (row.notif_daily_verse && hour === (row.notif_daily_verse_hour ?? 8)) {
      due.push({ row, kind: "daily_verse", day });
    }
    if (row.notif_streak_reminder && hour === STREAK_HOUR) {
      due.push({ row, kind: "streak_reminder", day });
    }
  }
  return due;
}

/**
 * A streak reminder goes only to someone whose streak is alive and whose
 * last visit was exactly yesterday-local — nudging today keeps it; anyone
 * already visited today (diff 0) or already lapsed (diff ≥ 2) is out.
 * daily_verse candidates pass through untouched.
 */
export function filterStreakEligible(
  due: Candidate[],
  streakByUser: Map<string, { current: number; last: string }>
): Candidate[] {
  return due.filter((d) => {
    if (d.kind !== "streak_reminder") return true;
    const s = streakByUser.get(d.row.user_id);
    return !!s && dayDiff(s.last, d.day) === 1;
  });
}
