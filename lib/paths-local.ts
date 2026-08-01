/**
 * Device-local path progress for guests, one key per path:
 * `mindkshetra-path-<id>` → { completedDays: number[] }.
 *
 * This is the single owner of that storage format. PathDetailClient writes it
 * when a guest marks a day, SadhanaClient writes it when a guest finishes a
 * path day's practice, and PathsListClient reads it for the "Day n of total"
 * card line. Signed-in (non-anonymous) users use /api/paths/[id]/run instead.
 */

export function guestPathKey(pathId: string): string {
  return `mindkshetra-path-${pathId}`;
}

export function readGuestPathDays(pathId: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(guestPathKey(pathId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completedDays?: unknown };
    if (!Array.isArray(parsed.completedDays)) return [];
    return parsed.completedDays.filter(
      (d): d is number => typeof d === "number" && Number.isInteger(d)
    );
  } catch {
    return [];
  }
}

export function writeGuestPathDays(pathId: string, completedDays: number[]): void {
  try {
    localStorage.setItem(
      guestPathKey(pathId),
      JSON.stringify({ completedDays })
    );
  } catch {
    /* storage unavailable or full — progress stays in memory only */
  }
}

/** Add one day and return the updated, sorted list. */
export function markGuestPathDay(pathId: string, day: number): number[] {
  const next = Array.from(new Set([...readGuestPathDays(pathId), day])).sort(
    (a, b) => a - b
  );
  writeGuestPathDays(pathId, next);
  return next;
}
