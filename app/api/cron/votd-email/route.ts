import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTodaysVotdPayload, sendVotdEmail } from "@/lib/votd-email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Daily Verse of the Day broadcast.
 * Schedule: 08:00 IST = 02:30 UTC → vercel.json cron "30 2 * * *"
 *
 * Subscribers = signed-up users with an email who have not opted out
 * (no prefs row, or votd_email_enabled = true).
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 503 }
    );
  }

  const payload = await loadTodaysVotdPayload();
  if (!payload) {
    return NextResponse.json({ error: "Verse unavailable" }, { status: 500 });
  }

  const admin = createAdminClient();

  const { data: optedOutRows, error: prefsError } = await admin
    .from("user_preferences")
    .select("user_id")
    .eq("votd_email_enabled", false);

  if (prefsError) {
    console.warn("[cron/votd-email] prefs query", prefsError.message);
    return NextResponse.json(
      { error: "Could not load preferences" },
      { status: 500 }
    );
  }

  const optedOut = new Set(
    (optedOutRows ?? []).map((r) => r.user_id as string).filter(Boolean)
  );

  const recipients: { id: string; email: string }[] = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      console.warn("[cron/votd-email] listUsers", error.message);
      return NextResponse.json(
        { error: "Could not list users", detail: error.message },
        { status: 500 }
      );
    }

    const users = data.users ?? [];
    for (const user of users) {
      const email = user.email?.trim();
      if (!email) continue;
      if (user.is_anonymous) continue;
      if (optedOut.has(user.id)) continue;
      recipients.push({ id: user.id, email });
    }

    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break; // safety cap
  }

  let sent = 0;
  let failed = 0;
  const errors: { email: string; error: string }[] = [];

  for (const recipient of recipients) {
    const result = await sendVotdEmail(recipient.email, payload, resendKey);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (errors.length < 20) {
        errors.push({ email: recipient.email, error: result.error });
      }
    }
    // Stay under Resend rate limits on free / starter plans.
    await sleep(120);
  }

  console.info("[cron/votd-email]", {
    ref: payload.ref,
    recipients: recipients.length,
    sent,
    failed,
  });

  return NextResponse.json({
    ok: true,
    ref: payload.ref,
    recipients: recipients.length,
    sent,
    failed,
    errors: errors.length ? errors : undefined,
  });
}
