import { NextResponse } from "next/server";
import { getAuthUserId, createClient } from "@/lib/supabase/server";
import {
  formatVerseRef,
  getAllSlokas,
  getSlokaById,
  getTeachingPassage,
} from "@/lib/slokas";
import { getCachedStory } from "@/lib/stories";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import type { Sloka } from "@/lib/types";

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function section(title: string, bodyHtml: string): string {
  return `
    <div style="margin-top: 28px;">
      <p style="margin: 0 0 8px; letter-spacing: 0.14em; text-transform: uppercase; font-size: 11px; color: #8a6a2f;">${escapeHtml(title)}</p>
      ${bodyHtml}
    </div>`;
}

function buildVotdHtml(opts: {
  sloka: Sloka;
  ref: string;
  site: string;
  storyEn: string | null;
  storyHi: string | null;
}): string {
  const { sloka, ref, site, storyEn, storyHi } = opts;
  const meaningEn = sloka.english_meaning?.trim();
  const meaningHi = sloka.hindi_meaning?.trim();
  const words = sloka.word_meanings
    ? Object.entries(sloka.word_meanings).slice(0, 12)
    : [];

  const wordBlock =
    words.length > 0
      ? section(
          "Word meanings",
          `<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555;">${words
            .map(
              ([k, v]) =>
                `<strong>${escapeHtml(k)}</strong> — ${escapeHtml(v)}`
            )
            .join("<br/>")}</p>`
        )
      : "";

  const meaningBlock =
    meaningEn || meaningHi
      ? section(
          "Meaning",
          `${
            meaningEn
              ? `<p style="margin: 0 0 10px; font-size: 15px; line-height: 1.6; color: #333;">${escapeHtml(meaningEn)}</p>`
              : ""
          }${
            meaningHi
              ? `<p style="margin: 0; font-size: 15px; line-height: 1.65; color: #444;">${escapeHtml(meaningHi)}</p>`
              : ""
          }`
        )
      : "";

  const storyBlock =
    storyEn || storyHi
      ? section(
          "Reflection story",
          `${
            storyEn
              ? `<p style="margin: 0 0 12px; font-size: 15px; line-height: 1.65; color: #333; white-space: pre-wrap;">${escapeHtml(storyEn)}</p>`
              : ""
          }${
            storyHi
              ? `<p style="margin: 0; font-size: 15px; line-height: 1.7; color: #444; white-space: pre-wrap;">${escapeHtml(storyHi)}</p>`
              : ""
          }`
        )
      : "";

  const tags =
    sloka.tags?.length > 0
      ? section(
          "Themes",
          `<p style="margin: 0; font-size: 13px; color: #666;">${escapeHtml(
            sloka.tags.map((t) => t.replace(/_/g, " ")).join(" · ")
          )}</p>`
        )
      : "";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding: 8px;">
      <p style="letter-spacing: 0.16em; text-transform: uppercase; font-size: 12px; color: #8a6a2f; margin: 0 0 6px;">MindKshetra · Verse of the day</p>
      <h1 style="font-size: 28px; font-weight: 600; margin: 0 0 16px;">${escapeHtml(ref)}</h1>

      ${section(
        "Sanskrit",
        `<p style="margin: 0; font-size: 20px; line-height: 1.75;">${escapeHtml(sloka.sanskrit_devanagari)}</p>`
      )}

      ${section(
        "Transliteration",
        `<p style="margin: 0; font-size: 15px; line-height: 1.6; font-style: italic; color: #555;">${escapeHtml(sloka.transliteration_iast)}</p>`
      )}

      ${section(
        "English",
        `<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333;">${escapeHtml(sloka.english_translation)}</p>`
      )}

      ${section(
        "Hindi",
        `<p style="margin: 0; font-size: 16px; line-height: 1.7; color: #444;">${escapeHtml(sloka.hindi_translation)}</p>`
      )}

      ${meaningBlock}
      ${wordBlock}
      ${storyBlock}
      ${tags}

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e0d5;">
        <p style="margin: 0 0 8px;"><a href="${site}/verse-of-the-day" style="color: #8a6a2f;">Open verse of the day →</a></p>
        <p style="margin: 0 0 8px;"><a href="${site}/sloka/${sloka.id}" style="color: #8a6a2f;">Full verse page →</a></p>
        <p style="margin: 0;"><a href="${site}/madhav" style="color: #8a6a2f;">Ask Madhav about this teaching →</a></p>
      </div>
      <p style="margin-top: 24px; font-size: 12px; color: #888;">
        You can turn off Verse of the Day emails anytime in Account settings on MindKshetra.
      </p>
    </div>
  `;
}

export async function GET() {
  const configured = Boolean(process.env.RESEND_API_KEY?.trim());
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

  return NextResponse.json({ configured, enabled });
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
      { error: "Sign in with email to receive Verse of the Day." },
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

  const all = await getAllSlokas();
  const seed = daySeed();
  const sloka =
    (await getSlokaById(all[seed % all.length]?.id ?? 1)) ?? all[0];
  if (!sloka) {
    return NextResponse.json({ error: "Verse unavailable" }, { status: 500 });
  }

  const passage = await getTeachingPassage(sloka.id);
  let storyEnText: string | null = null;
  let storyHiText: string | null = null;
  if (passage?.mode === "scene" && passage.sceneEn && passage.sceneHi) {
    storyEnText = passage.sceneEn;
    storyHiText = passage.sceneHi;
  } else {
    const key = passage?.anchorId ?? sloka.id;
    const [storyEn, storyHi] = await Promise.all([
      getCachedStory(key, "en"),
      getCachedStory(key, "hi"),
    ]);
    storyEnText = storyEn?.story ?? null;
    storyHiText = storyHi?.story ?? null;
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://mindkshetra.app";
  const ref = formatVerseRef(sloka);
  const from =
    process.env.RESEND_FROM?.trim() || "MindKshetra <onboarding@resend.dev>";

  const html = buildVotdHtml({
    sloka,
    ref,
    site,
    storyEn: storyEnText,
    storyHi: storyHiText,
  });

  const textParts = [
    `Verse of the day · ${ref}`,
    "",
    sloka.sanskrit_devanagari,
    "",
    sloka.transliteration_iast,
    "",
    `English: ${sloka.english_translation}`,
    `Hindi: ${sloka.hindi_translation}`,
  ];
  if (sloka.english_meaning) {
    textParts.push("", `Meaning: ${sloka.english_meaning}`);
  }
  if (storyEnText) {
    textParts.push("", "Story:", storyEnText);
  }
  textParts.push("", `${site}/verse-of-the-day`);

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
      text: textParts.join("\n"),
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
