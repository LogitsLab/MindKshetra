/**
 * Server helpers for meditation course progress + completions.
 */
import { recordEvent } from "@/lib/events";
import {
  FOUNDATION_PROGRAM_ID,
  getSessionById,
  loadFoundationProgram,
  nextUnlockedDay,
  type MeditationSession,
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
};

export async function getMeditationProgress(
  userId: string | null,
  programId: string = FOUNDATION_PROGRAM_ID
): Promise<MeditationProgress> {
  const program = loadFoundationProgram();
  const daysCount = program?.days_count ?? 7;

  if (!userId) {
    return {
      programId,
      currentDay: 1,
      completedDays: [],
      track: null,
      guest: true,
      streak: null,
    };
  }

  const supabase = await createClient();
  const [{ data: run }, { data: streakRow }] = await Promise.all([
    supabase
      .from("meditation_runs")
      .select("current_day, completed_days, track")
      .eq("user_id", userId)
      .eq("program_id", programId)
      .maybeSingle(),
    supabase
      .from("sadhana_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .eq("practice", "meditation")
      .maybeSingle(),
  ]);

  const completedDays = (run?.completed_days as number[] | null) ?? [];
  const currentDay =
    run?.current_day ??
    nextUnlockedDay(completedDays, daysCount);

  return {
    programId,
    currentDay,
    completedDays,
    track: (run?.track as string | null) ?? null,
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

export async function completeMeditationSession(
  userId: string,
  input: CompleteMeditationInput
): Promise<{
  progress: MeditationProgress;
  streak: { current: number; longest: number; graceUsedToday?: boolean };
  session: MeditationSession;
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

  // Course days advance unlock; daily standalones do not touch foundation run.
  let progress: MeditationProgress;
  if (session.tier === "foundation" && session.day_number >= 1) {
    const program = loadFoundationProgram();
    const daysCount = program?.days_count ?? 7;
    const { data: existing } = await supabase
      .from("meditation_runs")
      .select("current_day, completed_days, track")
      .eq("user_id", userId)
      .eq("program_id", FOUNDATION_PROGRAM_ID)
      .maybeSingle();

    const completed = new Set<number>(
      (existing?.completed_days as number[] | null) ?? []
    );
    completed.add(session.day_number);
    const completedDays = Array.from(completed).sort((a, b) => a - b);
    const nextDay = Math.min(
      daysCount,
      Math.max(
        existing?.current_day ?? 1,
        nextUnlockedDay(completedDays, daysCount)
      )
    );

    const { error: runError } = await supabase.from("meditation_runs").upsert(
      {
        user_id: userId,
        program_id: FOUNDATION_PROGRAM_ID,
        current_day: nextDay,
        completed_days: completedDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_id" }
    );
    if (runError) {
      console.error("[meditation] run upsert", runError.message);
      throw new Error("Could not update progress");
    }
    progress = await getMeditationProgress(userId, FOUNDATION_PROGRAM_ID);
  } else {
    progress = await getMeditationProgress(userId, FOUNDATION_PROGRAM_ID);
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
  });
  await recordEvent("sadhana_logged", userId, { practice: "meditation" });

  return {
    progress,
    streak: logged.streak,
    session,
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
  for (const row of completions.slice(0, 20)) {
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
      /* skip bad rows */
    }
  }
  return { merged };
}
