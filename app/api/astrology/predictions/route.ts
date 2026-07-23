import { NextRequest, NextResponse } from "next/server";
import { refreshCurrentDasha } from "@/lib/astrology/dasha";
import { computeChart } from "@/lib/astrology/engine";
import {
  mapMemberRow,
  memberToBirthInput,
  parseBirthBody,
} from "@/lib/astrology/members";
import { writePredictions } from "@/lib/astrology/predictions";
import { ENGINE_VERSION, type ChartPayload } from "@/lib/astrology/types";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { memoryGet, memorySet } from "@/lib/astrology/memory-cache";
import { redisGet, redisSet } from "@/lib/redis";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";
import { DateTime } from "luxon";

async function cacheGet(key: string): Promise<string | null> {
  return (await redisGet(key)) ?? memoryGet(key);
}

async function cacheSet(key: string, value: string, ttl: number): Promise<void> {
  const ok = await redisSet(key, value, ttl);
  if (!ok) memorySet(key, value, ttl);
}

function liveChart(chart: ChartPayload): ChartPayload {
  return refreshCurrentDasha(chart, DateTime.utc().toISODate()!);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rl = await rateLimit(
    `astro:predict:${clientKey(request)}`,
    10,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const language = body.language === "hi" ? "hi" : "en";
  const force = Boolean(body.force);

  try {
    let chart: ChartPayload;
    let memberId: string | null = null;
    let sessionId: string | null = null;

    if (body.memberId) {
      memberId = String(body.memberId);
      const userId = await getSignedInUserId();
      if (!userId) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      }
      const supabase = await createClient();
      const { data: row } = await supabase
        .from("astrology_members")
        .select("*")
        .eq("id", memberId)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (!row) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      const { data: cached } = await supabase
        .from("astrology_chart_cache")
        .select("payload")
        .eq("member_id", memberId)
        .eq("engine_version", ENGINE_VERSION)
        .maybeSingle();

      chart = liveChart(
        cached?.payload
          ? (cached.payload as ChartPayload)
          : computeChart(memberToBirthInput(mapMemberRow(row)))
      );

      if (
        !force &&
        chart.predictionsText?.portrait &&
        chart.predictionsText.language === language
      ) {
        return NextResponse.json({ chart, cached: true });
      }

      chart.predictionsText = await writePredictions(chart, language);

      await supabase.from("astrology_chart_cache").upsert(
        {
          member_id: memberId,
          engine_version: ENGINE_VERSION,
          payload: chart,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "member_id,engine_version" }
      );

      return NextResponse.json({ chart, cached: false });
    }

    sessionId = body.sessionId ? String(body.sessionId) : null;
    if (sessionId) {
      const cached = await cacheGet(`astro:incog:${sessionId}`);
      if (cached) {
        chart = liveChart(JSON.parse(cached) as ChartPayload);
        if (
          !force &&
          chart.predictionsText?.portrait &&
          chart.predictionsText.language === language
        ) {
          await cacheSet(
            `astro:incog:${sessionId}`,
            JSON.stringify(chart),
            60 * 60 * 6
          );
          return NextResponse.json({ sessionId, chart, cached: true });
        }
        chart.predictionsText = await writePredictions(chart, language);
        await cacheSet(
          `astro:incog:${sessionId}`,
          JSON.stringify(chart),
          60 * 60 * 6
        );
        return NextResponse.json({ sessionId, chart, cached: false });
      }
      // Cache miss (e.g. server restart) — recompute from birth if provided
      const birthFromSession = parseBirthBody(body.birth ?? body);
      if (birthFromSession) {
        chart = liveChart(computeChart(birthFromSession));
        chart.predictionsText = await writePredictions(chart, language);
        await cacheSet(
          `astro:incog:${sessionId}`,
          JSON.stringify(chart),
          60 * 60 * 6
        );
        return NextResponse.json({ sessionId, chart, cached: false });
      }
      return NextResponse.json(
        { error: "Session expired — cast the chart again" },
        { status: 404 }
      );
    }

    const birth = parseBirthBody(body.birth ?? body);
    if (!birth) {
      return NextResponse.json(
        { error: "Provide memberId, sessionId, or birth payload" },
        { status: 400 }
      );
    }
    chart = liveChart(computeChart(birth));
    chart.predictionsText = await writePredictions(chart, language);
    return NextResponse.json({ chart });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Predictions failed";
    console.error("[astrology/predictions]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
