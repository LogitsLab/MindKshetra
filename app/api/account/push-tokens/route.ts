import { NextRequest, NextResponse } from "next/server";
import { isExpoPushToken } from "@/lib/notifications/expo-push";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Device push-token registry (device_push_tokens, migration 020).
 *
 * Anonymous OR signed-in: a device can register before anyone signs in
 * (user_id null) and the upsert on expo_push_token re-homes a shared device
 * to whoever is holding it now — account switches never error on the unique
 * constraint, and the previous owner stops receiving that device's pushes.
 * The table is service-role only, so both verbs go through the admin client.
 */

function tableMissing(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|relation .* does not exist/i.test(
      error.message ?? ""
    )
  );
}

function tableMissingResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Notification tables are missing — apply supabase/migrations/020_notifications.sql in the Supabase SQL editor",
    },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;

  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `notify:tokens:${principalKey(userId, request)}`,
    10,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.expoPushToken;
  const platform = body?.platform;
  const appVersion = body?.appVersion;
  if (!isExpoPushToken(token)) {
    return NextResponse.json(
      { error: "expoPushToken is not a valid Expo push token" },
      { status: 400 }
    );
  }
  if (platform != null && !["ios", "android"].includes(platform)) {
    return NextResponse.json(
      { error: "platform must be 'ios' or 'android'" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("device_push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: platform ?? null,
      app_version: typeof appVersion === "string" ? appVersion.slice(0, 40) : null,
      last_seen_at: new Date().toISOString(),
      failure_count: 0,
      disabled_at: null,
    },
    { onConflict: "expo_push_token" }
  );
  if (error) {
    if (tableMissing(error)) return tableMissingResponse();
    console.warn("[account/push-tokens] upsert failed:", error.message);
    return NextResponse.json(
      { error: "Could not register token" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

/** Sign-out: forget this device entirely. */
export async function DELETE(request: NextRequest) {
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;

  const userId = await getAuthUserId();
  const rl = await rateLimit(
    `notify:tokens:${principalKey(userId, request)}`,
    10,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.expoPushToken;
  if (!isExpoPushToken(token)) {
    return NextResponse.json(
      { error: "expoPushToken is not a valid Expo push token" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("device_push_tokens")
    .delete()
    .eq("expo_push_token", token);
  if (error) {
    if (tableMissing(error)) return tableMissingResponse();
    // A silently failed delete means pushes keep arriving after sign-out.
    console.warn("[account/push-tokens] delete failed:", error.message);
    return NextResponse.json(
      { error: "Could not remove token" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
