import { NextRequest, NextResponse } from "next/server";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import { composeMadhavToday } from "@/lib/madhav/today";
import { loadMadhavSeeker } from "@/lib/madhav/seeker";
import { isValidTimezone } from "@/lib/practice-streaks";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { formatVerseRef } from "@/lib/sloka-utils";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Empty-state pack for Ask Madhav: one greeting, three starters, the name
 * the UI should show. Guests get VOTD + panchang when cheap; signed-in
 * seekers also get today's practice log and onboarding prefs. Fail-soft —
 * missing votd/sadhana/panchang still returns a usable greeting.
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `madhav:today:${principalKey(userId, request)}`,
    30,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const lang = request.nextUrl.searchParams.get("lang") === "hi" ? "hi" : "en";
  const tzRaw = request.nextUrl.searchParams.get("tz");
  const timezone = isValidTimezone(tzRaw) ? tzRaw : undefined;

  const [votdRef, seeker, doneToday, dayMark] = await Promise.all([
    loadVotdRef(),
    loadMadhavSeeker(userId),
    loadDoneToday(userId, timezone),
    loadDayMark(),
  ]);

  const copy = composeMadhavToday({
    lang,
    displayName: seeker?.displayName ?? "",
    votdRef,
    doneToday,
    festivalLabel:
      lang === "hi" ? dayMark.festivalHi : dayMark.festivalEn,
    isEkadashi: dayMark.isEkadashi,
    goals: seeker?.goals ?? [],
    guidanceStyle: seeker?.guidanceStyle ?? null,
  });

  return NextResponse.json({
    displayName: seeker?.displayName ?? "",
    addressName: copy.addressName,
    greeting: copy.greeting,
    starters: copy.starters,
    votdRef,
  });
}

async function loadVotdRef(): Promise<string | null> {
  try {
    const selection = await getVerseOfTheDaySelection();
    return selection?.sloka ? formatVerseRef(selection.sloka) : null;
  } catch (err) {
    console.warn(
      "[madhav/today] votd failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

async function loadDoneToday(
  userId: string | null,
  timezone?: string
): Promise<string[]> {
  if (!userId) return [];
  try {
    const { getSadhanaSummary } = await import("@/lib/sadhana");
    const summary = await getSadhanaSummary(userId, timezone);
    return summary.doneToday ?? [];
  } catch (err) {
    console.warn(
      "[madhav/today] sadhana failed:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}

async function loadDayMark(): Promise<{
  isEkadashi: boolean;
  festivalEn: string | null;
  festivalHi: string | null;
}> {
  const empty = {
    isEkadashi: false,
    festivalEn: null as string | null,
    festivalHi: null as string | null,
  };
  try {
    const { redisGet } = await import("@/lib/redis");
    const { localDayString } = await import("@/lib/practice-streaks");
    const date = localDayString("Asia/Kolkata");
    // Same bucket as /api/panchang default Delhi 28.6139, 77.209.
    const raw = await redisGet(`panchang:v2:${date}:28.6:77.2`);
    if (!raw) return empty;
    const data = JSON.parse(raw) as {
      isEkadashi?: boolean;
      festivals?: Array<{ labelEn?: string; labelHi?: string }>;
    };
    const fest = data.festivals?.[0];
    return {
      isEkadashi: Boolean(data.isEkadashi),
      festivalEn: fest?.labelEn?.trim() || null,
      festivalHi: fest?.labelHi?.trim() || null,
    };
  } catch {
    return empty;
  }
}
