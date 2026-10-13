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
  /** Crossfade from the opener into the verse. Zero is a hard cut. */
  openFade: number;
  /** Crossfade from the verse into the store card. */
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
  const openFade = xfade;
  const verse = Math.min(90, Math.max(8, Math.round(audioSec * 1000) / 1000));
  const offset1 = intro - openFade;
  const offset2 = offset1 + verse - xfade;
  const total = intro + verse + end - openFade - xfade;
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
    openFade,
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

/**
 * Daily story: the startup still holds for one second with the name in the
 * middle, then the shloka plays with the recitation, then the store card.
 */
export function dailyStoryTimeline(audioSec: number): ReelTimeline {
  return storyTimeline(audioSec, 1);
}

/** Story cut used by the daily video. */
export function storyTimeline(audioSec: number, introSec: number): ReelTimeline {
  const intro = introSec;
  const end = 5.2;
  const openFade = 0;
  const xfade = 0.5;
  const verse = Math.min(90, Math.max(8, Math.round(audioSec * 1000) / 1000));
  const offset1 = intro;
  const offset2 = intro + verse - xfade;
  const total = intro + verse + end - xfade;
  const audioDelay = intro;
  const fadeIn = 0.2;
  const fadeOutDur = 1.3;
  const fadeOut = Math.max(
    audioDelay + fadeIn,
    audioDelay + audioSec - fadeOutDur
  );
  return {
    intro,
    verse,
    end,
    openFade,
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

/**
 * Same pool and order as the app's cold-start stills: the glade splash,
 * then boot-01 through boot-21.
 */
export const STARTUP_STILLS = [
  "00-glade.jpg",
  "01.jpg",
  "02.jpg",
  "03.jpg",
  "04.jpg",
  "05.jpg",
  "06.jpg",
  "07.jpg",
  "08.jpg",
  "09.jpg",
  "10.jpg",
  "11.jpg",
  "12.jpg",
  "13.jpg",
  "14.jpg",
  "15.jpg",
  "16.jpg",
  "17.jpg",
  "18.jpg",
  "19.jpg",
  "20.jpg",
  "21.jpg",
];

/** One still for the IST day, so a retry paints the same opener. */
export function startupStillName(day: string): string {
  let hash = 0;
  for (const ch of day) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  return STARTUP_STILLS[hash % STARTUP_STILLS.length] ?? STARTUP_STILLS[0]!;
}

export function istDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** One name every day, so a stored copy replaces yesterday's reel. */
export function reelFilename(): string {
  return "verse-of-day.mp4";
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
