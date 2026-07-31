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
import {
  INCOGNITO_TTL_SEC,
  incognitoKey,
  incognitoMissReason,
  mintChartSessionId,
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

function liveChart(chart: ChartPayload, asOfDate?: string): ChartPayload {
  const date =
    asOfDate && /^\d{4}-\d{2}-\d{2}$/.test(asOfDate)
      ? asOfDate
      : DateTime.utc().toISODate()!;
  return refreshCurrentDasha(chart, date);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Contract lives in lib/astrology/incognito.ts — shared with predictions + chat. */

export async function POST(request: NextRequest) {
  // Keyed per-user when signed in so carrier-NAT users don't share a bucket.
  const signedInUserId = await getSignedInUserId();
  const rl = await rateLimit(
    `astro:compute:${signedInUserId ?? clientKey(request)}`,
    20,
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

  const asOfDate =
    typeof body.asOfDate === "string" ? body.asOfDate : undefined;

  const session = readChartSessionId(body, "astrology/compute");
  if (!session.ok) {
    return NextResponse.json(
      { error: "Invalid chartSessionId" },
      { status: 400 }
    );
  }

  try {
    if (body.memberId) {
      return await computeForMember(
        String(body.memberId),
        signedInUserId,
        asOfDate
      );
    }

    if (session.id && !body.dob) {
      const key = incognitoKey(session.id);
      const cached = await cacheGet(key);
      if (cached) {
        const chart = liveChart(JSON.parse(cached) as ChartPayload, asOfDate);
        await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
        return NextResponse.json({
          chartSessionId: session.id,
          sessionId: session.id, // deprecated alias, drop after one deploy
          chart,
          persisted: false,
        });
      }
      // Rehydrate after cache expiry if the client still holds birth details.
      // Safe to write under session.id here: it passed the uuid v4 shape check,
      // so it cannot be a guessable key another client would collide with.
      const birth = parseBirthBody(body.birth ?? body);
      if (birth) {
        const chart = liveChart(computeChart(birth), asOfDate);
        await cacheSet(key, JSON.stringify(chart), INCOGNITO_TTL_SEC);
        return NextResponse.json({
          chartSessionId: session.id,
          sessionId: session.id, // deprecated alias, drop after one deploy
          chart,
          persisted: false,
        });
      }
      // eng/E16: distinguish "the TTL elapsed" from "there is no shared cache at
      // all". Without Redis the write went to one lambda's memory and this read
      // is in another, so the chart was never findable — telling the user their
      // session "expired" would be a lie and leaves them stuck. `recoverable`
      // tells the client to re-send `birth`, which it holds in sessionStorage.
      const reason = incognitoMissReason(redisEnabled());
      if (reason === "cache-unavailable") {
        console.warn(
          "[astrology/compute] incognito lookup missed with no shared cache — " +
            "Redis is unreachable, so charts cannot survive across routes."
        );
      }
      return NextResponse.json(
        {
          error:
            reason === "cache-unavailable"
              ? "Chart cache unavailable — resend birth details"
              : "Session expired",
          reason,
          recoverable: true,
        },
        { status: 404 }
      );
    }

    const birth = parseBirthBody(body);
    if (!birth) {
      return NextResponse.json({ error: "Invalid birth payload" }, { status: 400 });
    }

    const chart = liveChart(computeChart(birth), asOfDate);
    // Always server-minted. Never derived from the request body.
    const chartSessionId = mintChartSessionId();
    await cacheSet(
      incognitoKey(chartSessionId),
      JSON.stringify(chart),
      INCOGNITO_TTL_SEC
    );

    return NextResponse.json({
      chartSessionId,
      sessionId: chartSessionId, // deprecated alias, drop after one deploy
      chart,
      persisted: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Compute failed";
    console.error("[astrology/compute]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function computeForMember(
  memberId: string,
  userId: string | null,
  asOfDate?: string
) {
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
    // Read-only path: the dasha "now" refresh is derived at read time, so
    // persisting it here would only race a concurrent PATCH's cache delete
    // and resurrect a stale payload.
    const chart = liveChart(cached.payload as ChartPayload, asOfDate);
    return NextResponse.json({
      memberId,
      chart,
      persisted: true,
      cached: true,
    });
  }

  const chart = liveChart(computeChart(memberToBirthInput(member)), asOfDate);

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
