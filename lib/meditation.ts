/**
 * Progressive meditation course content (data/meditation/*.json).
 * Scripts + timed silence; audio_url reserved for Phase 2 recordings.
 */
import { readFileSync } from "fs";
import path from "path";
import {
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
} from "@/lib/meditation-core";
export {
  FOUNDATION_PROGRAM_ID,
  isDayUnlocked,
  nextUnlockedDay,
  sessionTranscript,
} from "@/lib/meditation-core";

const ROOT = path.join(process.cwd(), "data", "meditation");

export function loadFoundationProgram(): MeditationProgram | null {
  try {
    const raw = readFileSync(path.join(ROOT, "foundation-7.json"), "utf8");
    const data = JSON.parse(raw) as MeditationProgram;
    if (!data?.id || !Array.isArray(data.days) || data.days.length === 0) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
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

export function getFoundationDay(day: number): MeditationSession | null {
  const program = loadFoundationProgram();
  if (!program) return null;
  return program.days.find((d) => d.day_number === day) ?? null;
}

export function getSessionById(sessionId: string): MeditationSession | null {
  if (!/^[a-z0-9-]+$/i.test(sessionId)) return null;
  const program = loadFoundationProgram();
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
