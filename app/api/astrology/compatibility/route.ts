import { NextRequest, NextResponse } from "next/server";
import { computeCompatibility } from "@/lib/astrology/compatibility";
import { computeChart } from "@/lib/astrology/engine";
import { mapMemberRow, memberToBirthInput } from "@/lib/astrology/members";
import { ENGINE_VERSION, type ChartPayload } from "@/lib/astrology/types";
import { FEATURES, hasEntitlement, paywallResponse } from "@/lib/entitlements";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ceo/T11 — Kundli Milan between two SAVED members.
 *
 * Members only, never raw birth payloads. Compatibility is inherently about two
 * specific people, and accepting arbitrary birth data would turn this into an
 * open scoring endpoint for anyone's details. Both rows are scoped to the
 * signed-in user, and RLS on astrology_members backs that up.
 */
export async function POST(request: NextRequest) {
  const rl = await rateLimit(`astro:compat:${clientKey(request)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!(await hasEntitlement(FEATURES.compatibility))) {
    return paywallResponse(FEATURES.compatibility);
  }

  let body: { memberA?: string; memberB?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.warn(
      "[astro-compat] body parse failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    );
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { memberA, memberB } = body;
  if (!memberA || !memberB) {
    return NextResponse.json(
      { error: "memberA and memberB are required" },
      { status: 400 }
    );
  }
  if (memberA === memberB) {
    return NextResponse.json(
      { error: "Pick two different people" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const charts: ChartPayload[] = [];

    for (const id of [memberA, memberB]) {
      const { data: row } = await supabase
        .from("astrology_members")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (!row) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      const { data: cached } = await supabase
        .from("astrology_chart_cache")
        .select("payload")
        .eq("member_id", id)
        .eq("engine_version", ENGINE_VERSION)
        .maybeSingle();

      charts.push(
        cached?.payload
          ? (cached.payload as ChartPayload)
          : computeChart(memberToBirthInput(mapMemberRow(row)))
      );
    }

    const result = computeCompatibility(charts[0], charts[1]);
    if (!result) {
      // No moon position means no Ashtakoota. Saying so is better than a zero
      // that reads as "incompatible".
      return NextResponse.json(
        {
          error:
            "Compatibility needs a moon position for both charts. One of these " +
            "is missing a birth time.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Compatibility failed";
    console.error("[astro-compat]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
