import "server-only";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import {
  JOURNEY_ID_SHAPE,
  type Journey,
  type JourneyDay,
  type JourneyUnlock,
} from "@/lib/journeys/core";
import type { MeditationSession } from "@/lib/meditation-core";

/**
 * Journey content loader. Directory-scanned on purpose — the meditation course
 * used to be reachable only through a hardcoded `foundation-7.json` filename,
 * so adding a program meant editing code. Dropping a JSON file in is enough.
 *
 * Three source directories are read and normalized into one model:
 *   data/journeys/*.json   native journeys (already the unified shape)
 *   data/paths/*.json      legacy themed paths  → kind "scripture", unlock open
 *   data/meditation/*.json legacy programs      → kind "meditation", unlock chain
 * Legacy files keep working untouched; nothing had to be rewritten to ship.
 */

const ROOT = process.cwd();
const DIRS = {
  journeys: path.join(ROOT, "data", "journeys"),
  paths: path.join(ROOT, "data", "paths"),
  meditation: path.join(ROOT, "data", "meditation"),
};

/** Display order: the long arcs first, then the themed weeks. */
const ORDER = [
  "gita-21",
  "foundation-7",
  "meditation-21",
  "anxiety-7",
  "grief-7",
  "purpose-7",
  "relationships-7",
  "student-7",
];

/** daily-sits is a catalog of one-off sits, not a journey — never a run. */
const NOT_A_JOURNEY = new Set(["daily-sits"]);

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch (err) {
    // Never swallow silently: a missing data/ directory in a lambda is the
    // difference between "no journeys today" and "the feature is gone".
    console.error(`[journeys] unreadable ${file}:`, (err as Error).message);
    return null;
  }
}

function listJson(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch (err) {
    console.error(`[journeys] unreadable dir ${dir}:`, (err as Error).message);
    return [];
  }
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeScriptureDay(raw: unknown, index: number): JourneyDay | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const ref = d.ref as { chapter?: unknown; verse?: unknown } | undefined;
  const chapter = Number(ref?.chapter);
  const verse = Number(ref?.verse);
  if (!Number.isInteger(chapter) || !Number.isInteger(verse)) return null;
  const day = Number.isInteger(d.day) ? (d.day as number) : index + 1;
  return {
    day,
    kind: "scripture",
    ref: { chapter, verse },
    practice: (["sit", "japa", "pranayama", "flow", "meditation"] as const).includes(
      d.practice as never
    )
      ? (d.practice as JourneyDay["practice"])
      : "sit",
    minutes: Number.isFinite(Number(d.minutes)) ? Number(d.minutes) : 5,
    title_en: str(d.title_en),
    title_hi: str(d.title_hi, str(d.title_en)),
    prompt_en: str(d.prompt_en),
    prompt_hi: str(d.prompt_hi, str(d.prompt_en)),
  };
}

function normalizeMeditationDay(raw: unknown, index: number): JourneyDay | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (!Array.isArray(s.phases)) return null;
  const day = Number.isInteger(s.day_number)
    ? (s.day_number as number)
    : index + 1;
  const ref = s.ref as { chapter?: unknown; verse?: unknown } | undefined;
  const chapter = Number(ref?.chapter);
  const verse = Number(ref?.verse);
  return {
    day,
    kind: "meditation",
    practice: "meditation",
    minutes: Number.isFinite(Number(s.duration_minutes))
      ? Number(s.duration_minutes)
      : 5,
    title_en: str(s.title_en),
    title_hi: str(s.title_hi, str(s.title_en)),
    session: raw as MeditationSession,
    ...(Number.isInteger(chapter) && Number.isInteger(verse)
      ? { ref: { chapter, verse } }
      : {}),
  };
}

function toJourney(
  data: Record<string, unknown>,
  fallbackKind: "scripture" | "meditation",
  fallbackUnlock: JourneyUnlock
): Journey | null {
  const id = str(data.id);
  if (!id || !JOURNEY_ID_SHAPE.test(id) || NOT_A_JOURNEY.has(id)) return null;

  const kind =
    data.kind === "scripture" || data.kind === "meditation"
      ? (data.kind as Journey["kind"])
      : fallbackKind;
  const unlock =
    data.unlock === "open" || data.unlock === "chain"
      ? (data.unlock as JourneyUnlock)
      : fallbackUnlock;

  const rawDays = Array.isArray(data.days) ? data.days : [];
  const days = rawDays
    .map((d, i) =>
      kind === "meditation"
        ? normalizeMeditationDay(d, i)
        : normalizeScriptureDay(d, i)
    )
    .filter((d): d is JourneyDay => Boolean(d))
    .sort((a, b) => a.day - b.day);
  if (!days.length) return null;

  // Trust the file's count when it is at least the days present (meditation-21
  // describes a 21-day arc while shipping only days 8-21 — foundation-7 owns
  // the first week), otherwise fall back to what actually loaded.
  const declared = Number(data.days_count);
  const highest = days[days.length - 1].day;
  const days_count =
    Number.isInteger(declared) && declared >= highest ? declared : highest;

  return {
    id,
    kind,
    unlock,
    days_count,
    title_en: str(data.title_en),
    title_hi: str(data.title_hi, str(data.title_en)),
    intro_en: str(data.intro_en),
    intro_hi: str(data.intro_hi, str(data.intro_en)),
    days,
  };
}

let cache: Journey[] | null = null;

export function listJourneys(): Journey[] {
  // Only cache a NON-empty result. Caching [] froze a cold-start failure for
  // the life of the instance — the surface stayed blank until a redeploy.
  if (cache && cache.length) return cache;
  const found = new Map<string, Journey>();

  for (const file of listJson(DIRS.journeys)) {
    const data = readJson(path.join(DIRS.journeys, file));
    const j = data && toJourney(data, "scripture", "chain");
    if (j) found.set(j.id, j);
  }
  for (const file of listJson(DIRS.paths)) {
    const data = readJson(path.join(DIRS.paths, file));
    const j = data && toJourney(data, "scripture", "open");
    if (j && !found.has(j.id)) found.set(j.id, j);
  }
  for (const file of listJson(DIRS.meditation)) {
    const data = readJson(path.join(DIRS.meditation, file));
    const j = data && toJourney(data, "meditation", "chain");
    if (j && !found.has(j.id)) found.set(j.id, j);
  }

  cache = Array.from(found.values()).sort((a, b) => {
    const ia = ORDER.indexOf(a.id);
    const ib = ORDER.indexOf(b.id);
    if (ia === -1 && ib === -1) return a.id.localeCompare(b.id);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return cache;
}

export function loadJourney(id: string): Journey | null {
  if (!id || !JOURNEY_ID_SHAPE.test(id)) return null;
  return listJourneys().find((j) => j.id === id) ?? null;
}

/** Journeys of one kind — the hub lists meditation, /paths lists scripture. */
export function listJourneysByKind(kind: Journey["kind"]): Journey[] {
  return listJourneys().filter((j) => j.kind === kind);
}
