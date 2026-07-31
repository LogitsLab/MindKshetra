import "server-only";
import { getAllSlokas, getSlokaById } from "@/lib/slokas";
import type { Sloka } from "@/lib/types";

/**
 * Canonical day-of-year seed for the verse-of-the-day rotation. Every surface
 * (home featured verse, /verse-of-the-day, the VOTD email, /api/votd/today)
 * must derive today's verse from this module so they can never disagree.
 */
export function daySeed(now = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return Math.floor((today - start) / 86_400_000);
}

/**
 * Selects by index into the chapter/verse-ordered corpus, not by raw id, so
 * the rotation is stable even if a backend returns rows in a different order.
 */
export async function getVerseOfTheDay(now = new Date()): Promise<Sloka | null> {
  const all = await getAllSlokas();
  if (all.length === 0) return null;
  const ordered = [...all].sort(
    (a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number
  );
  const pick = ordered[daySeed(now) % ordered.length];
  return (await getSlokaById(pick.id)) ?? pick;
}
