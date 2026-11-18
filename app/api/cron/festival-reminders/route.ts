import { NextResponse, type NextRequest } from "next/server";
import {
  dispatchFestivalReminders,
  MissingNotificationTablesError,
} from "@/lib/notifications/dispatch";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BUDGET_MS = 90_000;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/**
 * Festival / Ekadashi opt-in push fan-out.
 * Schedule (IST morning window): mirror votd-email — "30 2 * * *" UTC,
 * plus notify-dispatch which also hits users at send_hour_local.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;

  try {
    const admin = createAdminClient();
    const result = await dispatchFestivalReminders(
      admin,
      new Date(),
      Date.now() + BUDGET_MS
    );
    return NextResponse.json({
      ok: true,
      marks: result.marks,
      claimed: result.claimed,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err) {
    if (err instanceof MissingNotificationTablesError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.warn(
      "[cron/festival-reminders]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Festival dispatch failed" }, { status: 500 });
  }
}
