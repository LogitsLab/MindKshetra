import { NextRequest, NextResponse } from "next/server";
import { refreshCurrentDasha } from "@/lib/astrology/dasha";
import { computeChart } from "@/lib/astrology/engine";
import {
  mapMemberRow,
  memberToBirthInput,
  parseBirthBody,
} from "@/lib/astrology/members";
import { ENGINE_VERSION, type ChartPayload } from "@/lib/astrology/types";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { memoryGet, memorySet } from "@/lib/astrology/memory-cache";
import { redisGet, redisSet } from "@/lib/redis";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
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

const INCOGNITO_TTL_SEC = 60 * 60 * 6;

export async function POST(request: NextRequest) {
  const rl = await rateLimit(`astro:compute:${clientKey(request)}`, 20, 60_000);
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

  try {
    if (body.memberId) {
      return await computeForMember(String(body.memberId));
    }

    if (body.sessionId && typeof body.sessionId === "string" && !body.dob) {
      const cached = await cacheGet(`astro:incog:${body.sessionId}`);
      if (cached) {
        const chart = liveChart(JSON.parse(cached) as ChartPayload);
        await cacheSet(
          `astro:incog:${body.sessionId}`,
          JSON.stringify(chart),
          INCOGNITO_TTL_SEC
        );
        return NextResponse.json({
          sessionId: body.sessionId,
          chart,
          persisted: false,
        });
      }
      // Rehydrate after server restart if client still has birth
      const birth = parseBirthBody(body.birth ?? body);
      if (birth) {
        const chart = liveChart(computeChart(birth));
        await cacheSet(
          `astro:incog:${body.sessionId}`,
          JSON.stringify(chart),
          INCOGNITO_TTL_SEC
        );
        return NextResponse.json({
          sessionId: body.sessionId,
          chart,
          persisted: false,
        });
      }
      return NextResponse.json({ error: "Session expired" }, { status: 404 });
    }

    const birth = parseBirthBody(body);
    if (!birth) {
      return NextResponse.json({ error: "Invalid birth payload" }, { status: 400 });
    }

    const chart = liveChart(computeChart(birth));
    const sessionId = String(body.sessionId || randomUUID());
    await cacheSet(
      `astro:incog:${sessionId}`,
      JSON.stringify(chart),
      INCOGNITO_TTL_SEC
    );

    return NextResponse.json({
      sessionId,
      chart,
      persisted: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Compute failed";
    console.error("[astrology/compute]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function computeForMember(memberId: string) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("astrology_members")
    .select("*")
    .eq("id", memberId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const member = mapMemberRow(row);

  const { data: cached } = await supabase
    .from("astrology_chart_cache")
    .select("payload")
    .eq("member_id", memberId)
    .eq("engine_version", ENGINE_VERSION)
    .maybeSingle();

  if (cached?.payload) {
    const chart = liveChart(cached.payload as ChartPayload);
    await supabase.from("astrology_chart_cache").upsert(
      {
        member_id: memberId,
        engine_version: ENGINE_VERSION,
        payload: chart,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id,engine_version" }
    );
    return NextResponse.json({
      memberId,
      chart,
      persisted: true,
      cached: true,
    });
  }

  const chart = liveChart(computeChart(memberToBirthInput(member)));

  await supabase.from("astrology_chart_cache").upsert(
    {
      member_id: memberId,
      engine_version: ENGINE_VERSION,
      payload: chart,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id,engine_version" }
  );

  return NextResponse.json({
    memberId,
    chart,
    persisted: true,
    cached: false,
  });
}
