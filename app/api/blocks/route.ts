import { NextRequest, NextResponse } from "next/server";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Personal block list (own-row RLS). API-layer read filters are the UX;
 * RLS on the content tables remains the security boundary.
 */
export async function GET() {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_user_id, created_at")
    .eq("user_id", userId);
  return NextResponse.json({ blocks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `blocks:${principalKey(userId, request)}`,
    30,
    3600_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const blockedUserId = body?.blockedUserId;
  if (
    typeof blockedUserId !== "string" ||
    !UUID_SHAPE.test(blockedUserId) ||
    blockedUserId === userId
  ) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_blocks").upsert(
    { user_id: userId, blocked_user_id: blockedUserId },
    { onConflict: "user_id,blocked_user_id", ignoreDuplicates: true }
  );
  if (error) {
    return NextResponse.json({ error: "Could not block" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const blockedUserId = body?.blockedUserId;
  if (typeof blockedUserId !== "string" || !UUID_SHAPE.test(blockedUserId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }
  const supabase = await createClient();
  await supabase
    .from("user_blocks")
    .delete()
    .eq("user_id", userId)
    .eq("blocked_user_id", blockedUserId);
  return NextResponse.json({ ok: true });
}
