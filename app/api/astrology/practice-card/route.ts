import { NextRequest, NextResponse } from "next/server";
import { pickVerseIndex, pressureBasis } from "@/lib/bridge/pressure-practice";
import { localDayString } from "@/lib/practice-streaks";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { formatVerseRef } from "@/lib/sloka-utils";
import { getSlokasByTags } from "@/lib/slokas";
import { ENGINE_VERSION, type ChartPayload } from "@/lib/astrology/types";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pressure → Practice card for a saved member's chart: the area under most
 * tension, one verse from that area's bridge tags, one small action index.
 * Fail-soft by the same contract as /api/moods/order — any error and the
 * client renders nothing; this card may only ever add to the overview.
 */

const IST = "Asia/Kolkata";

/** Whole days since epoch for the IST calendar date — drives daily rotation. */
function istDayNumber(now: Date): number {
  const [y, m, d] = localDayString(IST, now).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export async function POST(request: NextRequest) {
  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `astro:practice-card:${principalKey(userId, request)}`,
    30,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const memberId = typeof body?.memberId === "string" ? body.memberId : null;
  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("astrology_members")
    .select("id")
    .eq("id", memberId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { data: cached } = await supabase
    .from("astrology_chart_cache")
    .select("payload")
    .eq("member_id", memberId)
    .eq("engine_version", ENGINE_VERSION)
    .maybeSingle();

  const chart = cached?.payload as ChartPayload | undefined;
  const dayNumber = istDayNumber(new Date());
  const basis = pressureBasis(chart?.verdicts?.blended, dayNumber);
  if (!basis) {
    // No cached chart, or a chart with no tensions anywhere — both mean the
    // overview stays quiet. Distinguishing them helps nobody.
    return NextResponse.json({ error: "No pressure to read" }, { status: 404 });
  }

  const matches = await getSlokasByTags(basis.tags);
  if (!matches.length) {
    return NextResponse.json({ error: "No verse available" }, { status: 404 });
  }
  const ordered = [...matches].sort(
    (a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number
  );
  const verse = ordered[pickVerseIndex(ordered.length, dayNumber)];

  return NextResponse.json({
    area: basis.area,
    fact: basis.fact,
    timing: basis.timing,
    actionIndex: basis.actionIndex,
    verse: {
      id: verse.id,
      ref: formatVerseRef(verse),
      english: verse.english_translation,
      hindi: verse.hindi_translation,
    },
  });
}
