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
import {
  INCOGNITO_TTL_SEC,
  incognitoKey,
  incognitoMissReason,
  readChartSessionId,
} from "@/lib/astrology/incognito";
import { recordEvent } from "@/lib/events";
import { redisEnabled, redisGet, redisSet } from "@/lib/redis";
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
// The write-up is a single long Groq completion; platform-default timeouts
// can cut it off mid-generation and surface as an opaque fetch failure.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Keyed per-user when signed in so carrier-NAT users don't share a bucket.
  const signedInUserId = await getSignedInUserId();
  const rl = await rateLimit(
    `astro:predict:${signedInUserId ?? clientKey(request)}`,
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
      const userId = signedInUserId;
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
        return NextResponse.json({
          chart,
          cached: true,
          source: chart.predictionsText.source ?? "llm",
        });
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

      await recordEvent("predictions_viewed", signedInUserId, {
        mode: "member",
        source: chart.predictionsText.source ?? "llm",
      });

      return NextResponse.json({
        chart,
        cached: false,
        source: chart.predictionsText.source ?? "llm",
      });
    }

    const session = readChartSessionId(body, "astrology/predictions");
    if (!session.ok) {
      return NextResponse.json(
        { error: "Invalid chartSessionId" },
        { status: 400 }
      );
    }
    sessionId = session.id;
    if (sessionId) {
      const key = incognitoKey(sessionId);
      // `sessionId` is echoed back under both names for one deploy; see
      // lib/astrology/incognito.ts for why the field was renamed.
      const echo = { chartSessionId: sessionId, sessionId };
      const cached = await cacheGet(key);
      if (cached) {
        chart = liveChart(JSON.parse(cached) as ChartPayload);
        if (
          !force &&
          chart.predictionsText?.portrait &&
          chart.predictionsText.language === language
        ) {
          await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
          return NextResponse.json({
            ...echo,
            chart,
            cached: true,
            source: chart.predictionsText.source ?? "llm",
          });
        }
        chart.predictionsText = await writePredictions(chart, language);
        await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
        await recordEvent("predictions_viewed", signedInUserId, {
          mode: "incognito",
          source: chart.predictionsText.source ?? "llm",
        });
        return NextResponse.json({
          ...echo,
          chart,
          cached: false,
          source: chart.predictionsText.source ?? "llm",
        });
      }
      // Cache miss (e.g. TTL expiry) — recompute from birth if provided.
      // Safe to write under sessionId: it passed the uuid v4 shape check.
      const birthFromSession = parseBirthBody(body.birth ?? body);
      if (birthFromSession) {
        chart = liveChart(computeChart(birthFromSession));
        chart.predictionsText = await writePredictions(chart, language);
        await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
        await recordEvent("predictions_viewed", signedInUserId, {
          mode: "incognito",
          source: chart.predictionsText.source ?? "llm",
        });
        return NextResponse.json({
          ...echo,
          chart,
          cached: false,
          source: chart.predictionsText.source ?? "llm",
        });
      }
      // Same contract as /api/astrology/compute: `recoverable` tells the
      // client to re-send `birth`, which it holds locally.
      const reason = incognitoMissReason(redisEnabled());
      return NextResponse.json(
        {
          error:
            reason === "cache-unavailable"
              ? "Chart cache unavailable — resend birth details"
              : "Session expired — cast the chart again",
          reason,
          recoverable: true,
        },
        { status: 404 }
      );
    }

    const birth = parseBirthBody(body.birth ?? body);
    if (!birth) {
      return NextResponse.json(
        { error: "Provide memberId, chartSessionId, or birth payload" },
        { status: 400 }
      );
    }
    chart = liveChart(computeChart(birth));
    chart.predictionsText = await writePredictions(chart, language);
    await recordEvent("predictions_viewed", signedInUserId, {
      mode: "birth",
      source: chart.predictionsText.source ?? "llm",
    });
    return NextResponse.json({
      chart,
      source: chart.predictionsText.source ?? "llm",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Predictions failed";
    console.error("[astrology/predictions]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
