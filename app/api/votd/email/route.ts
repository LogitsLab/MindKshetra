import { NextResponse } from "next/server";
import { getAuthUserId, createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import {
  loadTodaysVotdPayload,
  sendVotdEmail,
} from "@/lib/votd-email";

export async function GET() {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ||
    "MindKshetra <noreply@mind.logitslab.com>";
  const configured = Boolean(resendKey);
  const testingMode = /onboarding@resend\.dev/i.test(from);
  const userId = await getAuthUserId();
  let enabled = true;

  if (userId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("user_preferences")
      .select("votd_email_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (data && typeof data.votd_email_enabled === "boolean") {
      enabled = data.votd_email_enabled;
    }
  }

  return NextResponse.json({
    configured,
    enabled,
    testingMode,
    from,
    note: testingMode
      ? "RESEND_FROM still uses onboarding@resend.dev — only the Resend account email can receive mail. Use RESEND_FROM=MindKshetra <noreply@mind.logitslab.com> (verified domain)."
      : undefined,
  });
}

export async function POST(request: Request) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return NextResponse.json(
      {
        error:
          "VOTD email is not configured. Set RESEND_API_KEY (and optional RESEND_FROM).",
      },
      { status: 503 }
    );
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = await rateLimit(
    `votd-email:${clientKey(request)}`,
    3,
    3_600_000
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many email requests. Try again later." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email || user?.is_anonymous) {
    return NextResponse.json(
      {
        error:
          "Sign in with Google (or email) so we have an inbox to send today’s verse to.",
      },
      { status: 400 }
    );
  }

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("votd_email_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs && prefs.votd_email_enabled === false) {
    return NextResponse.json(
      {
        error:
          "Verse of the Day emails are turned off in your account settings.",
      },
      { status: 403 }
    );
  }

  const payload = await loadTodaysVotdPayload();
  if (!payload) {
    return NextResponse.json({ error: "Verse unavailable" }, { status: 500 });
  }

  const result = await sendVotdEmail(email, payload, resendKey);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, providerStatus: result.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, ref: payload.ref, to: email });
}
