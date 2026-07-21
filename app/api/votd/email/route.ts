import { NextResponse } from "next/server";
import { getAuthUserId, createClient } from "@/lib/supabase/server";
import {
  formatVerseRef,
  getAllSlokas,
  getSlokaById,
} from "@/lib/slokas";
import { rateLimit, clientKey } from "@/lib/rateLimit";

function daySeed(): number {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return Math.floor((today - start) / 86_400_000);
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.RESEND_API_KEY?.trim()),
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

  const limited = await rateLimit(`votd-email:${clientKey(request)}`, 3, 3_600_000);
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
      { error: "Sign in with email to receive Verse of the Day." },
      { status: 400 }
    );
  }

  const all = await getAllSlokas();
  const seed = daySeed();
  const sloka =
    (await getSlokaById(all[seed % all.length]?.id ?? 1)) ?? all[0];
  if (!sloka) {
    return NextResponse.json({ error: "Verse unavailable" }, { status: 500 });
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://mindkshetra.app";
  const ref = formatVerseRef(sloka);
  const from =
    process.env.RESEND_FROM?.trim() || "MindKshetra <onboarding@resend.dev>";

  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; color: #1a1a1a;">
      <p style="letter-spacing: 0.12em; text-transform: uppercase; font-size: 12px; color: #8a6a2f;">Verse of the day</p>
      <h1 style="font-size: 28px; font-weight: 600;">${ref}</h1>
      <p style="font-size: 18px; line-height: 1.6;">${sloka.sanskrit_devanagari}</p>
      <p style="font-size: 16px; line-height: 1.55; color: #444;">${sloka.english_translation}</p>
      <p style="font-size: 15px; line-height: 1.55; color: #555;">${sloka.hindi_translation}</p>
      <p style="margin-top: 24px;"><a href="${site}/verse-of-the-day" style="color: #8a6a2f;">Open on MindKshetra →</a></p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Verse of the day · ${ref}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn("[votd/email] Resend error", res.status, body);
    return NextResponse.json(
      { error: "Could not send email. Check RESEND_API_KEY / RESEND_FROM." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, ref, to: email });
}
