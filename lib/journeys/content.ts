import "server-only";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import {
  JOURNEY_ID_SHAPE,
  type Journey,
  type JourneyDay,
  type JourneyUnlock,
} from "@/lib/journeys/core";
import {
  SITTING_COURSE_ID,
  SITTING_SEGMENT_IDS,
  type MeditationSession,
} from "@/lib/meditation-core";

/**
 * Journey content loader. Directory-scanned on purpose — the meditation course
 * used to be reachable only through a hardcoded `foundation-7.json` filename,
 * so adding a program meant editing code. Dropping a JSON file in is enough.
 *
 * Three source directories are read and normalized into one model:
 *   data/journeys/*.json   native journeys (already the unified shape)
 *   data/paths/*.json      legacy themed paths  → kind "scripture", unlock open
 *   data/meditation/*.json legacy programs      → kind "meditation", unlock chain
 *
 * Sitting segments (foundation-7, meditation-21, meditation-45) are composed
 * into one `sitting-course` journey so day 8 unlocks after day 7 in the same run.
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
  SITTING_COURSE_ID,
  "anxiety-7",
  "grief-7",
  "purpose-7",
  "relationships-7",
  "sleep-7",
  "student-7",
];

/** daily-sits is a catalog of one-off sits, not a journey — never a run. */
const NOT_A_JOURNEY = new Set(["daily-sits"]);

/** Segments are composed into sitting-course; do not list them alone. */
const SITTING_SEGMENTS = new Set<string>(SITTING_SEGMENT_IDS);

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
    : Number.isInteger(s.day)
      ? (s.day as number)
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
      : Number.isFinite(Number(s.minutes))
        ? Number(s.minutes)
        : 5,
    title_en: str(s.title_en),
    title_hi: str(s.title_hi, str(s.title_en)),
    session: {
      ...(raw as MeditationSession),
      day_number: day,
    },
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

function composeSittingCourse(segments: Journey[]): Journey | null {
  const byId = new Map(segments.map((j) => [j.id, j]));
  const days: JourneyDay[] = [];
  for (const id of SITTING_SEGMENT_IDS) {
    const seg = byId.get(id);
    if (!seg) continue;
    for (const d of seg.days) {
      if (d.kind !== "meditation") continue;
      if (days.some((x) => x.day === d.day)) continue;
      days.push(d);
    }
  }
  days.sort((a, b) => a.day - b.day);
  if (!days.length) return null;

  const highest = days[days.length - 1].day;
  const foundation = byId.get("foundation-7");
  const habit = byId.get("meditation-21");
  const deepening = byId.get("meditation-45");

  const title_en =
    deepening?.title_en ||
    habit?.title_en ||
    foundation?.title_en ||
    "Sitting course";
  const title_hi =
    deepening?.title_hi ||
    habit?.title_hi ||
    foundation?.title_hi ||
    title_en;
  const intro_en =
    deepening?.intro_en ||
    (highest >= 21
      ? "A free progressive sit — foundation, habit, and deepening. Finish a day to unlock the next. Missing a calendar day never erases your place."
      : foundation?.intro_en || "");
  const intro_hi =
    deepening?.intro_hi ||
    (highest >= 21
      ? "मुफ़्त क्रमिक बैठक — नींव, आदत, और गहराई। दिन पूर्ण होने पर अगला खुलता है। कैलेंडर का दिन छूटने से प्रगति नहीं मिटती।"
      : foundation?.intro_hi || intro_en);

  return {
    id: SITTING_COURSE_ID,
    kind: "meditation",
    unlock: "chain",
    days_count: highest,
    title_en:
      highest >= 45
        ? "Forty-five days of sitting"
        : highest >= 21
          ? "Twenty-one days of sitting"
          : title_en,
    title_hi:
      highest >= 45
        ? "बैठने के पैंतालीस दिन"
        : highest >= 21
          ? "बैठने के इक्कीस दिन"
          : title_hi,
    intro_en,
    intro_hi,
    days,
  };
}

let cache: Journey[] | null = null;

export function listJourneys(): Journey[] {
  // Only cache a NON-empty result. Caching [] froze a cold-start failure for
  // the life of the instance — the surface stayed blank until a redeploy.
  if (cache && cache.length) return cache;
  const found = new Map<string, Journey>();
  const sittingSegments: Journey[] = [];

  for (const file of listJson(DIRS.journeys)) {
    const data = readJson(path.join(DIRS.journeys, file));
    const j = data && toJourney(data, "scripture", "chain");
    if (!j) continue;
    if (SITTING_SEGMENTS.has(j.id)) {
      sittingSegments.push(j);
      continue;
    }
    found.set(j.id, j);
  }
  for (const file of listJson(DIRS.paths)) {
    const data = readJson(path.join(DIRS.paths, file));
    const j = data && toJourney(data, "scripture", "open");
    if (j && !found.has(j.id) && !SITTING_SEGMENTS.has(j.id)) {
      found.set(j.id, j);
    }
  }
  for (const file of listJson(DIRS.meditation)) {
    const data = readJson(path.join(DIRS.meditation, file));
    const j = data && toJourney(data, "meditation", "chain");
    if (!j) continue;
    if (SITTING_SEGMENTS.has(j.id)) {
      sittingSegments.push(j);
      continue;
    }
    if (!found.has(j.id)) found.set(j.id, j);
  }

  const sitting = composeSittingCourse(sittingSegments);
  if (sitting) found.set(sitting.id, sitting);

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
  // Legacy segment ids resolve to the composed sitting course.
  if (SITTING_SEGMENTS.has(id) || id === SITTING_COURSE_ID) {
    return listJourneys().find((j) => j.id === SITTING_COURSE_ID) ?? null;
  }
  return listJourneys().find((j) => j.id === id) ?? null;
}

/** Journeys of one kind — the hub lists meditation, /paths lists scripture. */
export function listJourneysByKind(kind: Journey["kind"]): Journey[] {
  return listJourneys().filter((j) => j.kind === kind);
}

/** Clear loader cache (tests). */
export function clearJourneyCache(): void {
  cache = null;
}
