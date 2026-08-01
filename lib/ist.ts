import { localDayString } from "@/lib/practice-streaks";

/**
 * The one import for IST calendar-day math (eng review T9). The product's
 * shared day boundary — VOTD rotation, nakshatra reads, practice-card
 * rotation — is the IST calendar day; per-user surfaces (streaks, push
 * windows) stay on localDayString with the user's own timezone.
 */
export const IST = "Asia/Kolkata";

/** YYYY-MM-DD of the current IST calendar day. */
export function istDayString(now: Date = new Date()): string {
  return localDayString(IST, now);
}

/** Whole days since epoch for the IST calendar day — stable daily rotations. */
export function istDayNumber(now: Date = new Date()): number {
  const [y, m, d] = istDayString(now).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}
