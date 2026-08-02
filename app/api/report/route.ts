import { NextRequest, NextResponse } from "next/server";
import { killSwitchEngaged } from "@/lib/kill-switch";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";
import { getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES = new Set(["reflection", "profile", "circle_post"]);

/**
 * User reports feed the human review queue. Signed-in only — anonymous
 * reporting is an abuse vector on a small moderation team. 20/day per user.
 */
export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;
  if (killSwitchEngaged("COMMUNITY_REPORTS_ENABLED")) {
    return NextResponse.json(
      { error: "Reporting is paused right now." },
      { status: 503 }
    );
  }

  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `report:${principalKey(userId, request)}`,
    20,
    24 * 3600_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const contentType = body?.contentType;
  const contentId = body?.contentId;
  if (
    !CONTENT_TYPES.has(contentType) ||
    typeof contentId !== "string" ||
    !contentId.trim() ||
    contentId.length > 64
  ) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }
  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : null;

  const admin = createAdminClient();

  // One open report per (user, content): duplicates are accepted (202) but
  // never stack queue rows. The 016 partial unique index backstops this
  // pre-check under concurrency.
  const { data: existing } = await admin
    .from("moderation_queue")
    .select("id")
    .eq("content_type", contentType)
    .eq("content_id", contentId.trim())
    .eq("reported_by", userId)
    .eq("status", "open")
    .eq("source", "report")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const { error } = await admin.from("moderation_queue").insert({
    content_type: contentType,
    content_id: contentId.trim(),
    reported_by: userId,
    reason,
    source: "report",
  });
  if (error) {
    // 23505 = the 016 unique index caught a concurrent duplicate — success.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true }, { status: 202 });
    }
    console.warn("[report]", error.message);
    return NextResponse.json({ error: "Could not report" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
