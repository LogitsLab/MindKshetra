import "server-only";
import {
  advanceRun,
  nextDayFrom,
  normalizeDays,
  type Journey,
  type JourneyRun,
} from "@/lib/journeys/core";
import { loadJourney } from "@/lib/journeys/content";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side journey progress over `journey_runs` (migration 019).
 *
 * supabase-js never throws: every result here checks `.error` and surfaces it,
 * because a silently swallowed write fabricates practice history — the same
 * rule lib/sadhana.ts follows.
 */

const GUEST_RUN = (journeyId: string): JourneyRun => ({
  journeyId,
  currentDay: 1,
  completedDays: [],
  guest: true,
});

export async function getJourneyRun(
  userId: string | null,
  journey: Journey
): Promise<JourneyRun> {
  if (!userId) return GUEST_RUN(journey.id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_runs")
    .select("current_day, completed_days")
    .eq("user_id", userId)
    .eq("journey_id", journey.id)
    .maybeSingle();
  if (error) {
    console.error("[journeys] run read failed:", error.message);
    throw new Error("Could not read journey progress");
  }
  if (!data) {
    return { ...GUEST_RUN(journey.id), guest: false };
  }

  const completedDays = normalizeDays(data.completed_days, journey.days_count);
  return {
    journeyId: journey.id,
    completedDays,
    currentDay: Math.max(
      1,
      Math.min(journey.days_count, Number(data.current_day) || 1)
    ),
    guest: false,
  };
}

/** Mark one day complete. Returns the run as persisted. */
export async function markJourneyDay(
  userId: string,
  journey: Journey,
  day: number
): Promise<JourneyRun> {
  const existing = await getJourneyRun(userId, journey);
  const next = advanceRun(
    existing.completedDays,
    existing.currentDay,
    day,
    journey.days_count,
    journey.unlock
  );

  const supabase = await createClient();
  const { error } = await supabase.from("journey_runs").upsert(
    {
      user_id: userId,
      journey_id: journey.id,
      current_day: next.currentDay,
      completed_days: next.completedDays,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,journey_id" }
  );
  if (error) {
    console.error("[journeys] run upsert failed:", error.message);
    throw new Error("Could not save journey progress");
  }

  return { journeyId: journey.id, ...next, guest: false };
}

export type GuestJourneyPayload = {
  journeyId: string;
  completedDays: number[];
};

/**
 * Replay device-local journeys into the account on sign-in. Themed paths had
 * no merge path at all before this — a guest's week of practice died on the
 * device. Union semantics: a replay can only ever add days, so re-running is
 * safe and double-counting is impossible.
 */
export async function mergeGuestJourneys(
  userId: string,
  payload: unknown
): Promise<{ merged: number; received: number }> {
  const rows = Array.isArray(payload) ? payload.slice(0, 50) : [];
  let merged = 0;

  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const { journeyId, completedDays } = raw as GuestJourneyPayload;
    if (typeof journeyId !== "string") continue;
    const journey = loadJourney(journeyId);
    if (!journey) continue;
    const days = normalizeDays(completedDays, journey.days_count);
    if (!days.length) continue;

    const existing = await getJourneyRun(userId, journey);
    const union = normalizeDays(
      [...existing.completedDays, ...days],
      journey.days_count
    );
    if (union.length === existing.completedDays.length) continue;

    const supabase = await createClient();
    const { error } = await supabase.from("journey_runs").upsert(
      {
        user_id: userId,
        journey_id: journey.id,
        current_day: Math.max(
          existing.currentDay,
          nextDayFrom(union, journey.days_count, journey.unlock)
        ),
        completed_days: union,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,journey_id" }
    );
    if (error) {
      console.error("[journeys] merge upsert failed:", error.message);
      throw new Error("Could not merge journey progress");
    }
    merged += 1;
  }

  return { merged, received: rows.length };
}

/** Every run for a user — the catalog list and milestones both need this. */
export async function listJourneyRuns(
  userId: string
): Promise<Array<{ journeyId: string; currentDay: number; completedDays: number[] }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_runs")
    .select("journey_id, current_day, completed_days")
    .eq("user_id", userId);
  if (error) {
    console.error("[journeys] runs list failed:", error.message);
    throw new Error("Could not read journey progress");
  }
  return (data ?? []).map((row) => ({
    journeyId: row.journey_id as string,
    currentDay: Number(row.current_day) || 1,
    completedDays: Array.isArray(row.completed_days)
      ? (row.completed_days as number[])
      : [],
  }));
}
