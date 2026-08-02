import { normalizeDays } from "@/lib/journeys/core";

/**
 * Device-local journey progress for guests: `mindkshetra-journey-<id>` →
 * { completedDays: number[] }. The single owner of that format.
 *
 * Reads also accept the legacy `mindkshetra-path-<id>` key so nobody loses a
 * themed-path day when their device first meets the unified model; the value
 * is rewritten under the new key on the next write.
 */

const KEY_PREFIX = "mindkshetra-journey-";
const LEGACY_PATH_PREFIX = "mindkshetra-path-";

export function guestJourneyKey(journeyId: string): string {
  return `${KEY_PREFIX}${journeyId}`;
}

function readKey(key: string, daysCount: number): number[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completedDays?: unknown };
    return normalizeDays(parsed.completedDays, daysCount);
  } catch {
    return [];
  }
}

export function readGuestJourneyDays(
  journeyId: string,
  daysCount: number
): number[] {
  if (typeof window === "undefined") return [];
  const current = readKey(guestJourneyKey(journeyId), daysCount);
  if (current.length) return current;
  return readKey(`${LEGACY_PATH_PREFIX}${journeyId}`, daysCount);
}

export function writeGuestJourneyDays(
  journeyId: string,
  completedDays: number[]
): void {
  try {
    localStorage.setItem(
      guestJourneyKey(journeyId),
      JSON.stringify({ completedDays })
    );
  } catch {
    /* storage unavailable or full — progress stays in memory only */
  }
}

/** Add one day and return the updated, sorted list. */
export function markGuestJourneyDay(
  journeyId: string,
  day: number,
  daysCount: number
): number[] {
  const next = normalizeDays(
    [...readGuestJourneyDays(journeyId, daysCount), day],
    daysCount
  );
  writeGuestJourneyDays(journeyId, next);
  return next;
}

/**
 * Every guest journey on this device, for the sign-in merge. Scans both the
 * new and legacy prefixes so a first sign-in after the rename still carries
 * path days up to the account.
 */
export function readAllGuestJourneys(): Array<{
  journeyId: string;
  completedDays: number[];
}> {
  if (typeof window === "undefined") return [];
  const out = new Map<string, number[]>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const isNew = key.startsWith(KEY_PREFIX);
      const isLegacy = key.startsWith(LEGACY_PATH_PREFIX);
      if (!isNew && !isLegacy) continue;
      const journeyId = key.slice(
        (isNew ? KEY_PREFIX : LEGACY_PATH_PREFIX).length
      );
      if (!journeyId) continue;
      // A generous cap: the server re-validates against the real day count.
      const days = readKey(key, 400);
      if (!days.length) continue;
      const merged = Array.from(
        new Set([...(out.get(journeyId) ?? []), ...days])
      ).sort((a, b) => a - b);
      out.set(journeyId, merged);
    }
  } catch {
    return [];
  }
  return Array.from(out, ([journeyId, completedDays]) => ({
    journeyId,
    completedDays,
  }));
}

export function clearGuestJourney(journeyId: string): void {
  try {
    localStorage.removeItem(guestJourneyKey(journeyId));
    localStorage.removeItem(`${LEGACY_PATH_PREFIX}${journeyId}`);
  } catch {
    /* nothing to clear */
  }
}
