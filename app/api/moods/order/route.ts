import { NextRequest, NextResponse } from "next/server";
import { orderMoods } from "@/lib/mood-order";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { ENGINE_VERSION, type ChartPayload } from "@/lib/astrology/types";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chart-aware mood ordering for a SAVED member's chart. Optional and
 * fail-soft by contract: any error means the client keeps the static order —
 * this endpoint may only ever improve the surface, never break it.
 * (Incognito charts keep the static order for now; their session lives in
 * Redis and the ordering is a signed-in nicety first.)
 */
export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `moods:order:${principalKey(userId, request)}`,
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
  const blended = chart?.verdicts?.blended;
  if (!blended?.length) {
    return NextResponse.json(
      { error: "No chart verdicts yet — cast the chart first" },
      { status: 404 }
    );
  }

  return NextResponse.json(orderMoods(blended));
}
