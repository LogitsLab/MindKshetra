import {
  FALLBACK_TIMEZONE,
  isValidTimezone,
  localDayString,
} from "@/lib/practice-streaks";

/**
 * Pure scheduling math for the notification dispatcher: no supabase, no
 * fetch, no Date.now(). The dispatcher feeds it rows and a clock; tests feed
 * it fixtures. Timezone semantics mirror lib/practice-streaks (Intl-based,
 * invalid zones fall back to IST — a wrong-but-plausible hour beats never
 * delivering).
 */

export { FALLBACK_TIMEZONE };

/** Valid IANA zone or the IST fallback. */
export function resolveTimezone(tz: unknown): string {
  return isValidTimezone(tz) ? tz : FALLBACK_TIMEZONE;
}

/** The wall-clock hour (0-23) in `tz` at instant `now`. */
export function localHourInTz(tz: string, now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: resolveTimezone(tz),
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
}

/**
 * True when the user's local wall-clock hour equals their chosen send hour.
 * The dispatcher runs every ~30 minutes, so an hour-granular match fires at
 * most twice per local hour; the notification_log dedupe key collapses those
 * to one send per local day.
 */
export function isDueAtLocalHour(
  tz: string | null | undefined,
  now: Date,
  sendHourLocal: number
): boolean {
  return localHourInTz(resolveTimezone(tz), now) === sendHourLocal;
}

/** YYYY-MM-DD local calendar day in the user's zone. */
export function localDayInTz(tz: string | null | undefined, now: Date): string {
  return localDayString(resolveTimezone(tz), now);
}

/**
 * One daily-verse send per user per LOCAL day — the key rides
 * UNIQUE(user_id, channel, dedupe_key) on notification_log.
 */
export function dailyVerseDedupeKey(
  tz: string | null | undefined,
  now: Date
): string {
  return `daily-verse:${localDayInTz(tz, now)}`;
}
