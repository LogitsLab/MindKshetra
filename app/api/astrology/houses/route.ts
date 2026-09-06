import { NextRequest, NextResponse } from "next/server";
import { refreshCurrentDasha } from "@/lib/astrology/dasha";
import { computeChart } from "@/lib/astrology/engine";
import {
  mapMemberRow,
  memberToBirthInput,
  parseBirthBody,
} from "@/lib/astrology/members";
import { writeHouseReadings } from "@/lib/astrology/houses";
import { ENGINE_VERSION, type ChartPayload } from "@/lib/astrology/types";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { memoryGet, memorySet } from "@/lib/astrology/memory-cache";
import {
  INCOGNITO_TTL_SEC,
  incognitoKey,
  incognitoMissReason,
  readChartSessionId,
} from "@/lib/astrology/incognito";
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
// High-reasoning house generation is a single long Groq completion.
export const maxDuration = 60;

function fresh(chart: ChartPayload, language: "en" | "hi"): boolean {
  return (
    chart.housesText?.houses?.length === 12 &&
    chart.housesText.language === language
  );
}

export async function POST(request: NextRequest) {
  const signedInUserId = await getSignedInUserId();
  const rl = await rateLimit(
    `astro:houses:${signedInUserId ?? clientKey(request)}`,
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

    if (body.memberId) {
      const memberId = String(body.memberId);
      if (!signedInUserId) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      }
      const supabase = await createClient();
      const { data: row } = await supabase
        .from("astrology_members")
        .select("*")
        .eq("id", memberId)
        .eq("user_id", signedInUserId)
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

      if (!force && fresh(chart, language)) {
        return NextResponse.json({ chart, cached: true, source: chart.housesText!.source });
      }

      chart.housesText = await writeHouseReadings(chart, language);
      await supabase.from("astrology_chart_cache").upsert(
        {
          member_id: memberId,
          engine_version: ENGINE_VERSION,
          payload: chart,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "member_id,engine_version" }
      );
      return NextResponse.json({ chart, cached: false, source: chart.housesText.source });
    }

    const session = readChartSessionId(body, "astrology/houses");
    if (!session.ok) {
      return NextResponse.json({ error: "Invalid chartSessionId" }, { status: 400 });
    }
    if (session.id) {
      const key = incognitoKey(session.id);
      const echo = { chartSessionId: session.id, sessionId: session.id };
      const cached = await cacheGet(key);
      if (cached) {
        chart = liveChart(JSON.parse(cached) as ChartPayload);
        if (!force && fresh(chart, language)) {
          await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
          return NextResponse.json({ ...echo, chart, cached: true, source: chart.housesText!.source });
        }
        chart.housesText = await writeHouseReadings(chart, language);
        await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
        return NextResponse.json({ ...echo, chart, cached: false, source: chart.housesText.source });
      }
      const birthFromSession = parseBirthBody(body.birth ?? body);
      if (birthFromSession) {
        chart = liveChart(computeChart(birthFromSession));
        chart.housesText = await writeHouseReadings(chart, language);
        await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
        return NextResponse.json({ ...echo, chart, cached: false, source: chart.housesText.source });
      }
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
    chart.housesText = await writeHouseReadings(chart, language);
    return NextResponse.json({ chart, source: chart.housesText.source });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Houses failed";
    console.error("[astrology/houses]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
