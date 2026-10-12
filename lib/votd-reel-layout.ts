/**
 * Pure layout for the daily reel. The painted frames live in votd-reel.ts;
 * this file stays free of canvas and ffmpeg so the line breaks can be tested
 * against every verse.
 */

const W = 1080;
const H = 1920;

export const REEL_SIZE = { width: W, height: H };

/** Drop the trailing `।।5.25।।` marker. The big numeral is drawn on its own. */
function stripVerseMarker(text: string): string {
  return text.replace(/\s*।।\s*\d+\.\d+\s*।*\s*$/, "").trim();
}

/**
 * Two written lines, the way the shloka is set in the email: the first pada
 * ends on a single danda, the last pada closes with a double danda. The
 * corpus is two padas; a longer split is paired so sandhi is not broken
 * into a stack of fragments.
 */
export function sanskritLines(text: string): string[] {
  const body = stripVerseMarker(text.replace(/\s+/g, " ").trim());
  const padas = body
    .split(/\s*।\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (padas.length === 0) return [text.trim()];
  if (padas.length === 1) return [`${padas[0]}॥`];

  const paired =
    padas.length > 2
      ? [
          padas.slice(0, Math.ceil(padas.length / 2)).join("। ") + "।",
          padas.slice(Math.ceil(padas.length / 2)).join("। "),
        ]
      : padas;

  return paired.map((pada, index) =>
    index === paired.length - 1 ? `${pada}॥` : `${pada}।`
  );
}

export type ReelTimeline = {
  intro: number;
  verse: number;
  end: number;
  xfade: number;
  offset1: number;
  offset2: number;
  total: number;
  audioDelay: number;
  fadeIn: number;
  fadeOut: number;
  fadeOutDur: number;
};

/**
 * Intro lockup, the verse card held for the recitation, then the store card.
 * Crossfades match the approved reel: 0.5s, audio enters as the verse appears.
 */
export function reelTimeline(audioSec: number): ReelTimeline {
  const intro = 2.8;
  const end = 5.2;
  const xfade = 0.5;
  const verse = Math.min(90, Math.max(8, Math.round(audioSec * 1000) / 1000));
  const offset1 = intro - xfade;
  const offset2 = offset1 + verse - xfade;
  const total = intro + verse + end - xfade * 2;
  const audioDelay = 2.4;
  const fadeIn = 0.4;
  const fadeOutDur = 1.3;
  const fadeOut = Math.max(
    audioDelay + fadeIn,
    audioDelay + audioSec - fadeOutDur
  );
  return {
    intro,
    verse,
    end,
    xfade,
    offset1,
    offset2,
    total,
    audioDelay,
    fadeIn,
    fadeOut,
    fadeOutDur,
  };
}

export function reelFilename(ref: string): string {
  const safe = ref.replace(/[^0-9A-Za-z.]+/g, "-").replace(/^-+|-+$/g, "");
  return `verse-of-the-day-${safe || "verse"}.mp4`;
}

export function attachmentNote(hasVideo: boolean): string {
  return hasVideo ? "Today’s reel is attached." : "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Insert the attachment sentence at the marker in the verse email. */
export function applyAttachmentNote(
  html: string,
  text: string,
  note: string
): { html: string; text: string } {
  const clean = note.trim();
  if (!clean) return { html, text };
  const block = `<p style="margin: 28px 0 0; font-size: 15px; line-height: 1.55; color: #333;">${escapeHtml(clean)}</p>`;
  const marker = "<!-- votd-attachments -->";
  return {
    html: html.includes(marker) ? html.replace(marker, block) : html,
    text: `${text}\n\n${clean}`,
  };
}
