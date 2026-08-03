import { NextResponse, type NextRequest } from "next/server";
import {
  dispatchDailyVerse,
  MissingNotificationTablesError,
  processReceipts,
  sweepStalePending,
} from "@/lib/notifications/dispatch";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Notification dispatcher over migration 020's tables, scheduled every ~30
 * minutes (QStash / any scheduler) with `Authorization: Bearer CRON_SECRET`.
 * GET and POST behave identically — some schedulers only speak one verb.
 *
 * Order per run:
 *   1. receipts — settle Expo receipt status for recently sent tickets and
 *      disable DeviceNotRegistered tokens;
 *   2. sweeper  — re-claim pending rows stuck >10 min (crash/overlap
 *      recovery) and re-send or expire them;
 *   3. daily verse — claim-then-send for users whose local hour matches
 *      their chosen send hour.
 *
 * Time-boxed to ~240s of the 300s budget; the claim ledger makes the next
 * run resume exactly where a truncated run stopped.
 */
const DISPATCH_BUDGET_MS = 240_000;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;

  const admin = createAdminClient();
  const now = new Date();
  const deadline = Date.now() + DISPATCH_BUDGET_MS;

  try {
    const receiptsProcessed = await processReceipts(admin);
    const sweep = await sweepStalePending(admin, now);
    const daily = await dispatchDailyVerse(admin, now, deadline);

    return NextResponse.json({
      ok: true,
      receiptsProcessed,
      swept: sweep.swept,
      claimed: daily.claimed,
      sent: sweep.sent + daily.sent,
      failed: sweep.failed + daily.failed,
    });
  } catch (err) {
    if (err instanceof MissingNotificationTablesError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.warn(
      "[cron/notify-dispatch]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Dispatch failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
