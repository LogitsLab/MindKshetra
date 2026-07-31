import { NextRequest, NextResponse } from "next/server";
import { isExpoPushToken } from "@/lib/push";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Push token registry. Anonymous users may register — a Supabase anonymous id
 * survives the upgrade to a full account, so tokens follow the person.
 * Upserts go through the admin client so a shared device that switches
 * accounts re-owns its token instead of erroring on the unique constraint.
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `push:register:${principalKey(userId, request)}`,
    10,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token;
  const platform = body?.platform;
  if (!isExpoPushToken(token) || !["ios", "android"].includes(platform)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      last_seen_at: new Date().toISOString(),
      disabled_at: null,
    },
    { onConflict: "token" }
  );
  if (error) {
    console.warn("[push/register]", error.message);
    return NextResponse.json({ error: "Could not register" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Sign-out path: stop sends to this device without deleting history. */
export async function DELETE(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (!isExpoPushToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("push_tokens")
    .update({ disabled_at: new Date().toISOString() })
    .eq("token", token)
    .eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
