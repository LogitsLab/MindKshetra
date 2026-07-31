import { createClient } from "@/lib/supabase/server";
import { isDbContentEnabled } from "@/lib/content/source";
import {
  advanceStreak,
  dayDiff,
  localDayString,
  type StreakState,
} from "@/lib/practice-streaks";
import { resolveUserTimezone } from "@/lib/streaks";

/**
 * Sadhana practice log (migration 011). One model serves the Daily Sadhana
 * flow, japa, the sit timer, and pranayama. Guests log locally on-device and
 * replay through mergeGuestSadhana on sign-in; (user_id, client_ref) keeps the
 * replay idempotent.
 */
export const PRACTICES = ["flow", "japa", "sit", "pranayama"] as const;
export type Practice = (typeof PRACTICES)[number];

export function isPractice(value: unknown): value is Practice {
  return (
    typeof value === "string" && (PRACTICES as readonly string[]).includes(value)
  );
}

export type SadhanaSessionInput = {
  practice: Practice;
  /** Client-local day; accepted within ±1 day of the server-resolved day. */
  occurredOn?: string;
  durationSec?: number;
  count?: number;
  details?: Record<string, unknown>;
  /** Client uuid for merge dedupe; server mints one when absent. */
  clientRef?: string;
};

export type PracticeStreak = {
  practice: Practice;
  current: number;
  longest: number;
  lastDay: string | null;
};

export type SadhanaSummary = {
  today: string;
  /** Practices already logged today. */
  doneToday: Practice[];
  streaks: PracticeStreak[];
};

const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export async function getSadhanaSummary(
  userId: string,
  timezone?: string
): Promise<SadhanaSummary> {
  const today = localDayString(await resolveUserTimezone(userId, timezone));
  if (!isDbContentEnabled()) return { today, doneToday: [], streaks: [] };

  const supabase = await createClient();
  const [{ data: sessions }, { data: streaks }] = await Promise.all([
    supabase
      .from("sadhana_sessions")
      .select("practice")
      .eq("user_id", userId)
      .eq("occurred_on", today),
    supabase
      .from("sadhana_streaks")
      .select("practice, current_streak, longest_streak, last_day")
      .eq("user_id", userId),
  ]);

  const doneToday = Array.from(
    new Set((sessions ?? []).map((s) => s.practice as Practice))
  );

  return {
    today,
    doneToday,
    streaks: (streaks ?? []).map((row) => ({
      practice: row.practice as Practice,
      current: row.current_streak,
      longest: row.longest_streak,
      lastDay: (row.last_day as string | null) ?? null,
    })),
  };
}

export async function logSadhanaSession(
  userId: string,
  input: SadhanaSessionInput,
  timezone?: string
): Promise<{
  ok: true;
  occurredOn: string;
  streak: { current: number; longest: number; graceUsedToday?: boolean };
}> {
  const supabase = await createClient();
  const today = localDayString(await resolveUserTimezone(userId, timezone));

  // Offline devices may log against their own local day; accept small skew,
  // never the far past (that path is mergeGuestSadhana's).
  const occurredOn =
    input.occurredOn &&
    DAY_SHAPE.test(input.occurredOn) &&
    Math.abs(dayDiff(input.occurredOn, today)) <= 1
      ? input.occurredOn
      : today;

  const { error } = await supabase.from("sadhana_sessions").upsert(
    {
      user_id: userId,
      practice: input.practice,
      occurred_on: occurredOn,
      duration_sec: clampInt(input.durationSec, 0, 86_400),
      count: clampInt(input.count, 0, 100_000),
      details: input.details ?? null,
      ...(input.clientRef && UUID_SHAPE.test(input.clientRef)
        ? { client_ref: input.clientRef }
        : {}),
    },
    { onConflict: "user_id,client_ref", ignoreDuplicates: true }
  );
  // A failed insert must never fabricate practice history: surface it before
  // any streak math runs (the route turns the throw into a non-200 and the
  // client keeps its local copy to retry).
  if (error) {
    throw new Error("Could not record the session: " + error.message);
  }

  const streak = await advancePracticeStreak(userId, input.practice, occurredOn);
  return { ok: true, occurredOn, streak };
}

async function advancePracticeStreak(
  userId: string,
  practice: Practice,
  day: string
): Promise<{ current: number; longest: number; graceUsedToday?: boolean }> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sadhana_streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("practice", practice)
    .maybeSingle();

  const state: StreakState = existing
    ? {
        current: existing.current_streak,
        longest: existing.longest_streak,
        lastDay: (existing.last_day as string | null) ?? null,
        graceUsedOn: (existing.grace_used_on as string | null) ?? null,
      }
    : { current: 0, longest: 0, lastDay: null, graceUsedOn: null };

  const next = advanceStreak(state, day);
  if (!next.changed && existing) {
    return { current: existing.current_streak, longest: existing.longest_streak };
  }

  const { error } = await supabase.from("sadhana_streaks").upsert(
    {
      user_id: userId,
      practice,
      current_streak: next.current,
      longest_streak: next.longest,
      last_day: next.lastDay,
      grace_used_on: next.graceUsedOn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,practice" }
  );
  if (error) {
    throw new Error("Could not update the streak: " + error.message);
  }

  return {
    current: next.current,
    longest: next.longest,
    ...(next.graceConsumed ? { graceUsedToday: true } : {}),
  };
}

const MERGE_CAP = 200;

/**
 * `merged` counts rows actually written this call — an idempotent replay
 * reports 0, not the batch size. `received`/`capped` echo what arrived so a
 * client holding more than MERGE_CAP sessions knows to chunk and resend the
 * remainder instead of silently losing everything past the cap.
 */
export async function mergeGuestSadhana(
  userId: string,
  sessions: unknown,
  timezone?: string
): Promise<{
  merged: number;
  received: number;
  capped: boolean;
  streaks: PracticeStreak[];
}> {
  const supabase = await createClient();
  const today = localDayString(await resolveUserTimezone(userId, timezone));

  const received = Array.isArray(sessions) ? sessions.length : 0;

  const rows = (Array.isArray(sessions) ? sessions : [])
    .slice(0, MERGE_CAP)
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const s = raw as Record<string, unknown>;
      if (!isPractice(s.practice)) return [];
      const occurredOn =
        typeof s.occurredOn === "string" &&
        DAY_SHAPE.test(s.occurredOn) &&
        dayDiff(s.occurredOn, today) >= 0
          ? s.occurredOn
          : null;
      if (!occurredOn) return [];
      if (typeof s.clientRef !== "string" || !UUID_SHAPE.test(s.clientRef)) {
        return [];
      }
      return [
        {
          user_id: userId,
          practice: s.practice,
          occurred_on: occurredOn,
          duration_sec: clampInt(s.durationSec, 0, 86_400),
          count: clampInt(s.count, 0, 100_000),
          details: null,
          client_ref: s.clientRef,
        },
      ];
    });

  let merged = 0;
  if (rows.length) {
    const { data: inserted, error } = await supabase
      .from("sadhana_sessions")
      .upsert(rows, { onConflict: "user_id,client_ref", ignoreDuplicates: true })
      .select("id");
    // Throwing is what lets the client keep its local log: the route answers
    // non-200 and the device retries later instead of discarding history.
    if (error) {
      throw new Error("Could not merge the practice log: " + error.message);
    }
    // ignoreDuplicates returns only the rows this call inserted.
    merged = inserted?.length ?? 0;
    await recomputeStreaks(
      userId,
      Array.from(new Set(rows.map((r) => r.practice as Practice)))
    );
  }

  const summary = await getSadhanaSummary(userId, timezone);
  return {
    merged,
    received,
    capped: received > MERGE_CAP,
    streaks: summary.streaks,
  };
}

/**
 * After a merge the day sequence may have grown in the past, so fold every
 * distinct day through advanceStreak from scratch — the same math the live
 * path uses, applied to the full history.
 */
async function recomputeStreaks(
  userId: string,
  practices: Practice[]
): Promise<void> {
  const supabase = await createClient();
  for (const practice of practices) {
    const { data, error } = await supabase
      .from("sadhana_sessions")
      .select("occurred_on")
      .eq("user_id", userId)
      .eq("practice", practice)
      .order("occurred_on", { ascending: true });
    // A partial read would fold a truncated history into the streak — abort
    // instead; the merge is idempotent, so a retry recomputes from the top.
    if (error) {
      throw new Error("Could not read sessions to recompute streaks: " + error.message);
    }

    const days = Array.from(
      new Set((data ?? []).map((r) => r.occurred_on as string))
    );
    let state: StreakState = {
      current: 0,
      longest: 0,
      lastDay: null,
      graceUsedOn: null,
    };
    for (const day of days) {
      state = advanceStreak(state, day);
    }

    const { error: writeError } = await supabase.from("sadhana_streaks").upsert(
      {
        user_id: userId,
        practice,
        current_streak: state.current,
        longest_streak: state.longest,
        last_day: state.lastDay,
        grace_used_on: state.graceUsedOn,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,practice" }
    );
    if (writeError) {
      throw new Error("Could not update the streak: " + writeError.message);
    }
  }
}
