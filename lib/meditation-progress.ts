/**
 * Server helpers for meditation course progress + completions.
 * Course unlock lives on journey_runs (sitting-course); mood check-ins stay
 * on meditation_completions. Legacy foundation-7 / meditation-21 runs are
 * unioned on read so nobody loses a week.
 */
import { recordEvent } from "@/lib/events";
import {
  advanceRun,
  isDayUnlocked,
  nextDayFrom,
  normalizeDays,
} from "@/lib/journeys/core";
import { loadJourney } from "@/lib/journeys/content";
import {
  FOUNDATION_PROGRAM_ID,
  SITTING_COURSE_ID,
  SITTING_SEGMENT_IDS,
  getSessionById,
  loadSittingProgram,
  milestoneJustHit,
  type MeditationSession,
  type SittingMilestone,
} from "@/lib/meditation";
import { logSadhanaSession } from "@/lib/sadhana";
import { UUID_SHAPE } from "@/lib/sadhana-core";
import { createClient } from "@/lib/supabase/server";

export type MeditationProgress = {
  programId: string;
  currentDay: number;
  completedDays: number[];
  track: string | null;
  guest: boolean;
  streak: { current: number; longest: number } | null;
  milestone?: SittingMilestone | null;
};

const LEGACY_JOURNEY_IDS = [
  SITTING_COURSE_ID,
  FOUNDATION_PROGRAM_ID,
  "meditation-21",
  "meditation-45",
] as const;

async function readUnionCompletedDays(
  userId: string,
  daysCount: number
): Promise<{ completedDays: number[]; currentDay: number; track: string | null }> {
  const supabase = await createClient();
  const [{ data: journeyRows }, { data: meditationRun }] = await Promise.all([
    supabase
      .from("journey_runs")
      .select("journey_id, current_day, completed_days, track")
      .eq("user_id", userId)
      .in("journey_id", [...LEGACY_JOURNEY_IDS]),
    supabase
      .from("meditation_runs")
      .select("current_day, completed_days, track")
      .eq("user_id", userId)
      .eq("program_id", FOUNDATION_PROGRAM_ID)
      .maybeSingle(),
  ]);

  const union = new Set<number>();
  let furthestCursor = 1;
  let track: string | null = null;

  for (const row of journeyRows ?? []) {
    for (const d of normalizeDays(row.completed_days, daysCount)) {
      union.add(d);
    }
    furthestCursor = Math.max(
      furthestCursor,
      Number(row.current_day) || 1
    );
    if (row.journey_id === SITTING_COURSE_ID && row.track) {
      track = row.track as string;
    }
  }
  if (meditationRun) {
    for (const d of normalizeDays(meditationRun.completed_days, daysCount)) {
      union.add(d);
    }
    furthestCursor = Math.max(
      furthestCursor,
      Number(meditationRun.current_day) || 1
    );
    if (!track && meditationRun.track) track = meditationRun.track as string;
  }

  const completedDays = Array.from(union).sort((a, b) => a - b);
  const currentDay = Math.max(
    furthestCursor,
    nextDayFrom(completedDays, daysCount, "chain")
  );
  return {
    completedDays,
    currentDay: Math.min(daysCount, Math.max(1, currentDay)),
    track,
  };
}

export async function getMeditationProgress(
  userId: string | null,
  programId: string = SITTING_COURSE_ID
): Promise<MeditationProgress> {
  const program = loadSittingProgram();
  const daysCount = program?.days_count ?? 7;
  const id =
    programId === FOUNDATION_PROGRAM_ID ||
    (SITTING_SEGMENT_IDS as readonly string[]).includes(programId)
      ? SITTING_COURSE_ID
      : programId;

  if (!userId) {
    return {
      programId: id,
      currentDay: 1,
      completedDays: [],
      track: null,
      guest: true,
      streak: null,
    };
  }

  const supabase = await createClient();
  const [{ completedDays, currentDay, track }, { data: streakRow }] =
    await Promise.all([
      readUnionCompletedDays(userId, daysCount),
      supabase
        .from("sadhana_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .eq("practice", "meditation")
        .maybeSingle(),
    ]);

  return {
    programId: id,
    currentDay,
    completedDays,
    track,
    guest: false,
    streak: streakRow
      ? {
          current: streakRow.current_streak,
          longest: streakRow.longest_streak,
        }
      : { current: 0, longest: 0 },
  };
}

export type CompleteMeditationInput = {
  sessionId: string;
  moodBefore?: number | null;
  moodAfter?: number | null;
  durationSec?: number;
  clientRef?: string;
  timezone?: string;
};

function clampMood(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

const COURSE_TIERS = new Set(["foundation", "habit", "deepening", "goal"]);

export async function completeMeditationSession(
  userId: string,
  input: CompleteMeditationInput
): Promise<{
  progress: MeditationProgress;
  streak: { current: number; longest: number; graceUsedToday?: boolean };
  session: MeditationSession;
  milestone: SittingMilestone | null;
}> {
  const session = getSessionById(input.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const moodBefore = clampMood(input.moodBefore);
  const moodAfter = clampMood(input.moodAfter);
  const durationSec =
    typeof input.durationSec === "number" &&
    Number.isInteger(input.durationSec) &&
    input.durationSec >= 0 &&
    input.durationSec <= 86_400
      ? input.durationSec
      : session.duration_minutes * 60;

  const clientRef =
    input.clientRef && UUID_SHAPE.test(input.clientRef)
      ? input.clientRef
      : undefined;

  const supabase = await createClient();
  const journey = loadJourney(SITTING_COURSE_ID);
  const daysCount = journey?.days_count ?? loadSittingProgram()?.days_count ?? 7;

  // Server-side unlock for course days (dailies stay always-open).
  if (COURSE_TIERS.has(session.tier) && session.day_number >= 1) {
    const existing = await readUnionCompletedDays(userId, daysCount);
    if (
      !isDayUnlocked(
        session.day_number,
        existing.completedDays,
        daysCount,
        "chain"
      )
    ) {
      throw new Error("Day is locked");
    }
  }

  const { error: completionError } = await supabase
    .from("meditation_completions")
    .upsert(
      {
        user_id: userId,
        session_id: session.id,
        mood_before: moodBefore,
        mood_after: moodAfter,
        duration_sec: durationSec,
        ...(clientRef ? { client_ref: clientRef } : {}),
      },
      { onConflict: "user_id,client_ref", ignoreDuplicates: true }
    );

  if (completionError) {
    console.error("[meditation] completion upsert", completionError.message);
    throw new Error("Could not record completion");
  }

  let milestone: SittingMilestone | null = null;
  let progress: MeditationProgress;

  if (COURSE_TIERS.has(session.tier) && session.day_number >= 1) {
    const existing = await readUnionCompletedDays(userId, daysCount);
    const next = advanceRun(
      existing.completedDays,
      existing.currentDay,
      session.day_number,
      daysCount,
      "chain"
    );
    milestone = milestoneJustHit(next.completedDays, session.day_number);

    const { error: runError } = await supabase.from("journey_runs").upsert(
      {
        user_id: userId,
        journey_id: SITTING_COURSE_ID,
        current_day: next.currentDay,
        completed_days: next.completedDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,journey_id" }
    );
    if (runError) {
      console.error("[meditation] journey run upsert", runError.message);
      throw new Error("Could not update progress");
    }

    // Keep legacy meditation_runs in sync for one release (rollback safety).
    await supabase.from("meditation_runs").upsert(
      {
        user_id: userId,
        program_id: FOUNDATION_PROGRAM_ID,
        current_day: Math.min(7, next.currentDay),
        completed_days: next.completedDays.filter((d) => d <= 7),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_id" }
    );

    progress = await getMeditationProgress(userId, SITTING_COURSE_ID);
  } else {
    progress = await getMeditationProgress(userId, SITTING_COURSE_ID);
  }

  const logged = await logSadhanaSession(
    userId,
    {
      practice: "meditation",
      durationSec,
      details: {
        sessionId: session.id,
        day: session.day_number || null,
        moodBefore,
        moodAfter,
        tier: session.tier,
      },
      clientRef,
    },
    input.timezone
  );

  await recordEvent("meditation_completed", userId, {
    sessionId: session.id,
    day: session.day_number || null,
    moodBefore,
    moodAfter,
    tier: session.tier,
    milestone,
  });
  await recordEvent("sadhana_logged", userId, { practice: "meditation" });

  return {
    progress: { ...progress, milestone },
    streak: logged.streak,
    session,
    milestone,
  };
}

export type GuestMeditationCompletion = {
  sessionId: string;
  moodBefore?: number | null;
  moodAfter?: number | null;
  durationSec?: number;
  clientRef: string;
  occurredOn?: string;
};

export async function mergeGuestMeditation(
  userId: string,
  completions: GuestMeditationCompletion[],
  timezone?: string
): Promise<{ merged: number }> {
  let merged = 0;
  for (const row of completions.slice(0, 40)) {
    if (!row?.sessionId || !row.clientRef || !UUID_SHAPE.test(row.clientRef)) {
      continue;
    }
    try {
      await completeMeditationSession(userId, {
        sessionId: row.sessionId,
        moodBefore: row.moodBefore,
        moodAfter: row.moodAfter,
        durationSec: row.durationSec,
        clientRef: row.clientRef,
        timezone,
      });
      merged += 1;
    } catch {
      /* skip bad / locked rows */
    }
  }
  return { merged };
}
