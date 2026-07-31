import "server-only";
import { getAllSlokas, getSlokaById, getSlokasByTags } from "@/lib/slokas";
import { NAKSHATRA_TAGS } from "@/lib/nakshatra-tags";
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

export type TodaysNakshatra = { name: string; index: number };

export type VotdSelection = {
  sloka: Sloka;
  /** Present when the pick was nakshatra-driven (absent on engine fallback). */
  nakshatra?: TodaysNakshatra;
};

/**
 * Moon nakshatra at a canonical instant — 06:00 IST — so all surfaces and the
 * broadcast email agree globally. Per-user location would fork the email from
 * the site; one shared sky wins. Ephemeris only, no LLM. Returns null when the
 * engine is unavailable so callers can fall back.
 */
export function getTodaysNakshatra(now = new Date()): TodaysNakshatra | null {
  try {
    // The IST calendar date, then 06:00 IST === 00:30 UTC on that date.
    const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(now)
      .split("-")
      .map(Number);

    // Loaded lazily so a missing native sweph build never breaks the
    // whole-corpus fallback path below.
    const { utcPartsToJd, calcPlanetLongitude } =
      require("@/lib/astrology/swe") as typeof import("@/lib/astrology/swe");
    const { longitudeToNakshatra } =
      require("@/lib/astrology/signs") as typeof import("@/lib/astrology/signs");

    const { jdUt } = utcPartsToJd(y, m, d, 0, 30, 0);
    const moon = calcPlanetLongitude(jdUt, "moon");
    const nk = longitudeToNakshatra(moon.longitude);
    return { name: nk.nakshatra, index: nk.nakshatraIndex };
  } catch (err) {
    console.warn(
      "[votd] nakshatra unavailable, falling back to corpus rotation:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

function orderedByRef(slokas: Sloka[]): Sloka[] {
  return [...slokas].sort(
    (a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number
  );
}

// One selection per IST day per process — the home page renders this on every
// request and must not recompute ephemeris math each time.
let cached: { day: string; selection: VotdSelection | null } | null = null;

function istDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Nakshatra-driven verse of the day: today's Moon nakshatra maps to verse
 * tags (lib/nakshatra-tags.ts) and the day seed picks deterministically
 * inside that pool. Falls back to the original whole-corpus rotation when the
 * engine or the pool is unavailable — the surface never goes empty.
 */
export async function getVerseOfTheDaySelection(
  now = new Date()
): Promise<VotdSelection | null> {
  const day = istDay(now);
  if (cached?.day === day) return cached.selection;

  const selection = await computeSelection(now);
  cached = { day, selection };
  return selection;
}

async function computeSelection(now: Date): Promise<VotdSelection | null> {
  const nakshatra = getTodaysNakshatra(now);
  if (nakshatra) {
    try {
      const tags = NAKSHATRA_TAGS[nakshatra.name as keyof typeof NAKSHATRA_TAGS];
      const pool = orderedByRef(await getSlokasByTags(tags ?? []));
      if (pool.length > 0) {
        const pick = pool[daySeed(now) % pool.length];
        const sloka = (await getSlokaById(pick.id)) ?? pick;
        return { sloka, nakshatra };
      }
    } catch (err) {
      console.warn(
        "[votd] tag pool failed, falling back to corpus rotation:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const all = await getAllSlokas();
  if (all.length === 0) return null;
  const ordered = orderedByRef(all);
  const pick = ordered[daySeed(now) % ordered.length];
  const sloka = (await getSlokaById(pick.id)) ?? pick;
  return { sloka };
}

/** Back-compat shape used across the app; prefer getVerseOfTheDaySelection. */
export async function getVerseOfTheDay(now = new Date()): Promise<Sloka | null> {
  return (await getVerseOfTheDaySelection(now))?.sloka ?? null;
}
