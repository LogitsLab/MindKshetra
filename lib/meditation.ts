/**
 * Progressive meditation course content.
 * Scripts + timed silence; audio_url reserved for Phase 2 recordings.
 *
 * Course days come from the composed sitting-course journey (foundation +
 * habit + deepening segments). Daily sits stay in data/meditation/daily-sits.json.
 */
import { readFileSync } from "fs";
import path from "path";
import { loadJourney } from "@/lib/journeys/content";
import { journeyDay, type MeditationDay } from "@/lib/journeys/core";
import {
  SITTING_COURSE_ID,
  sessionTranscript,
  type DailySitsCatalog,
  type MeditationProgram,
  type MeditationSession,
} from "@/lib/meditation-core";

export type {
  DailySitsCatalog,
  MeditationPhase,
  MeditationProgram,
  MeditationSession,
  MeditationTier,
  SittingMilestone,
} from "@/lib/meditation-core";
export {
  FOUNDATION_PROGRAM_ID,
  SITTING_COURSE_ID,
  SITTING_MILESTONES,
  SITTING_SEGMENT_IDS,
  isDayUnlocked,
  milestoneJustHit,
  nextUnlockedDay,
  sessionTranscript,
  sittingSectionForDay,
} from "@/lib/meditation-core";

const ROOT = path.join(process.cwd(), "data", "meditation");

function journeyToProgram(journeyId: string = SITTING_COURSE_ID): MeditationProgram | null {
  const journey = loadJourney(journeyId);
  if (!journey || journey.kind !== "meditation") return null;
  const days: MeditationSession[] = [];
  for (const d of journey.days) {
    if (d.kind !== "meditation") continue;
    days.push(d.session);
  }
  if (!days.length) return null;
  return {
    id: journey.id,
    days_count: journey.days_count,
    title_en: journey.title_en,
    title_hi: journey.title_hi,
    intro_en: journey.intro_en,
    intro_hi: journey.intro_hi,
    days,
  };
}

/** Full progressive sitting course (1–21 or 1–45 when deepening ships). */
export function loadSittingProgram(): MeditationProgram | null {
  return journeyToProgram(SITTING_COURSE_ID);
}

/** @deprecated Prefer loadSittingProgram — kept for callers during migration. */
export function loadFoundationProgram(): MeditationProgram | null {
  return loadSittingProgram();
}

export function loadDailySits(): DailySitsCatalog | null {
  try {
    const raw = readFileSync(path.join(ROOT, "daily-sits.json"), "utf8");
    const data = JSON.parse(raw) as DailySitsCatalog;
    if (!data?.id || !Array.isArray(data.sessions)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getSittingDay(day: number): MeditationSession | null {
  const journey = loadJourney(SITTING_COURSE_ID);
  if (!journey) return null;
  const d = journeyDay(journey, day);
  if (!d || d.kind !== "meditation") return null;
  return (d as MeditationDay).session;
}

/** @deprecated Prefer getSittingDay */
export function getFoundationDay(day: number): MeditationSession | null {
  return getSittingDay(day);
}

export function getSessionById(sessionId: string): MeditationSession | null {
  if (!/^[a-z0-9-]+$/i.test(sessionId)) return null;
  const program = loadSittingProgram();
  const fromCourse = program?.days.find((d) => d.id === sessionId);
  if (fromCourse) return fromCourse;
  const dailies = loadDailySits();
  return dailies?.sessions.find((s) => s.id === sessionId) ?? null;
}

export function enrichTranscripts(session: MeditationSession): MeditationSession {
  return {
    ...session,
    transcript_en: sessionTranscript(session, "en"),
    transcript_hi: sessionTranscript(session, "hi"),
  };
}
