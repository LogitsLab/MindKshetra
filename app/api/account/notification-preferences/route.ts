import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-user notification preferences (notification_preferences, migration
 * 020). The camelCase wire contract below is what the mobile app calls —
 * keep it stable:
 *
 *   GET   → { pushEnabled, dailyVerse, streakReminder, continueReading,
 *             astrologyAlerts, reflections, weeklyDigestEmail, sendHourLocal }
 *   PATCH → any subset of the same keys; sendHourLocal is an integer 4-21.
 *
 * First GET creates the row with defaults. The table is service-role only,
 * so reads/writes go through the admin client after auth.
 */

type Row = {
  push_enabled: boolean;
  daily_verse: boolean;
  streak_reminder: boolean;
  continue_reading: boolean;
  astrology_alerts: boolean;
  reflections: boolean;
  weekly_digest_email: boolean;
  send_hour_local: number;
};

const ROW_COLUMNS =
  "push_enabled, daily_verse, streak_reminder, continue_reading, astrology_alerts, reflections, weekly_digest_email, send_hour_local";

const DEFAULTS: Row = {
  push_enabled: true,
  daily_verse: true,
  streak_reminder: true,
  continue_reading: false,
  astrology_alerts: false,
  reflections: false,
  weekly_digest_email: false,
  send_hour_local: 8,
};

/** camelCase wire key → snake_case column, all booleans. */
const BOOL_FIELDS = {
  pushEnabled: "push_enabled",
  dailyVerse: "daily_verse",
  streakReminder: "streak_reminder",
  continueReading: "continue_reading",
  astrologyAlerts: "astrology_alerts",
  reflections: "reflections",
  weeklyDigestEmail: "weekly_digest_email",
} as const;

function toWire(row: Row) {
  return {
    pushEnabled: row.push_enabled,
    dailyVerse: row.daily_verse,
    streakReminder: row.streak_reminder,
    continueReading: row.continue_reading,
    astrologyAlerts: row.astrology_alerts,
    reflections: row.reflections,
    weeklyDigestEmail: row.weekly_digest_email,
    sendHourLocal: row.send_hour_local,
  };
}

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

export async function GET() {
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .select(ROW_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (tableMissing(error)) return tableMissingResponse();
    console.warn("[notification-preferences] read failed:", error.message);
    return NextResponse.json(
      { error: "Could not load preferences" },
      { status: 500 }
    );
  }
  if (data) return NextResponse.json(toWire(data as Row));

  // First read: persist the defaults so the dispatcher sees this user.
  const { data: created, error: insertError } = await admin
    .from("notification_preferences")
    .upsert({ user_id: userId, ...DEFAULTS }, { onConflict: "user_id" })
    .select(ROW_COLUMNS)
    .single();
  if (insertError) {
    if (tableMissing(insertError)) return tableMissingResponse();
    console.warn(
      "[notification-preferences] create failed:",
      insertError.message
    );
    return NextResponse.json(
      { error: "Could not create preferences" },
      { status: 500 }
    );
  }
  return NextResponse.json(toWire(created as Row));
}

export async function PATCH(request: NextRequest) {
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, boolean | number> = {};
  for (const [wireKey, column] of Object.entries(BOOL_FIELDS)) {
    const value = (body as Record<string, unknown>)[wireKey];
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      return NextResponse.json(
        { error: `${wireKey} must be a boolean` },
        { status: 400 }
      );
    }
    updates[column] = value;
  }
  if (body.sendHourLocal !== undefined) {
    const hour = body.sendHourLocal;
    if (!Number.isInteger(hour) || hour < 4 || hour > 21) {
      return NextResponse.json(
        { error: "sendHourLocal must be an integer between 4 and 21" },
        { status: 400 }
      );
    }
    updates.send_hour_local = hour;
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json(
      { error: "Provide at least one preference field" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("notification_preferences")
    .select(ROW_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    if (tableMissing(readError)) return tableMissingResponse();
    console.warn("[notification-preferences] read failed:", readError.message);
    return NextResponse.json(
      { error: "Could not load preferences" },
      { status: 500 }
    );
  }

  const next = {
    user_id: userId,
    ...DEFAULTS,
    ...(existing ?? {}),
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("notification_preferences")
    .upsert(next, { onConflict: "user_id" })
    .select(ROW_COLUMNS)
    .single();
  if (error) {
    if (tableMissing(error)) return tableMissingResponse();
    console.warn("[notification-preferences] write failed:", error.message);
    return NextResponse.json(
      { error: "Could not save preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json(toWire(data as Row));
}
