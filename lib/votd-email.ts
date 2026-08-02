import "server-only";
import { daySeed, getVerseOfTheDay } from "@/lib/day-seed";
import { formatVerseRef, getTeachingPassage } from "@/lib/slokas";
import { getCachedStory } from "@/lib/stories";
import type { Sloka } from "@/lib/types";

export { daySeed };

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

export function buildVotdHtml(opts: {
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
        <p style="margin: 0 0 8px;"><a href="${site}/verse-of-the-day?ref=votd" style="color: #8a6a2f;">Open verse of the day →</a></p>
        <p style="margin: 0 0 8px;"><a href="${site}/sloka/${sloka.id}?ref=votd" style="color: #8a6a2f;">Full verse page →</a></p>
        <p style="margin: 0;"><a href="${site}/madhav" style="color: #8a6a2f;">Ask Madhav about this teaching →</a></p>
      </div>
      <p style="margin-top: 24px; font-size: 12px; color: #888;">
        You can turn off Verse of the Day emails anytime in Account settings on MindKshetra.
      </p>
    </div>
  `;
}

export type VotdPayload = {
  sloka: Sloka;
  ref: string;
  site: string;
  html: string;
  text: string;
  subject: string;
  from: string;
};

export async function loadTodaysVotdPayload(): Promise<VotdPayload | null> {
  const sloka = await getVerseOfTheDay();
  if (!sloka) return null;

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
    "https://mind.logitslab.com";
  const ref = formatVerseRef(sloka);
  const from =
    process.env.RESEND_FROM?.trim() ||
    "MindKshetra <noreply@mind.logitslab.com>";

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
  // ref=votd marks arrivals from this email (see docs/impact-metrics.md).
  textParts.push("", `${site}/verse-of-the-day?ref=votd`);

  return {
    sloka,
    ref,
    site,
    html,
    text: textParts.join("\n"),
    subject: `Verse of the day · ${ref}`,
    from,
  };
}

export function parseResendError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    if (parsed.message?.trim()) return parsed.message.trim();
  } catch {
    /* ignore */
  }
  if (status === 403) {
    return "Email provider rejected the send. Verify your domain in Resend and use a from-address on that domain.";
  }
  return "Could not send email. Check RESEND_API_KEY / RESEND_FROM.";
}

export async function sendVotdEmail(
  to: string,
  payload: VotdPayload,
  resendKey: string
): Promise<{ ok: true; id?: string } | { ok: false; error: string; status: number }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from,
      to: [to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn("[votd/email] Resend error", res.status, body);
    return {
      ok: false,
      error: parseResendError(res.status, body),
      status: res.status,
    };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: data.id };
}
