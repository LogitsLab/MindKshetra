import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type Canvas,
  type Image,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import ffmpegStatic from "ffmpeg-static";
import type { Sloka } from "@/lib/types";
import {
  reelTimeline,
  sanskritLines,
  type ReelTimeline,
} from "@/lib/votd-reel-layout";

const execFileAsync = promisify(execFile);

const W = 1080;
const H = 1920;
const COL_X = 96;
const COL_W = 888;

const BG = "#01060a";
const BRASS = "#d4af60";
const BRASS_DIM = "#a88848";
const CREAM = "#f5ecdc";
const MUTED = "#b0a48e";

const SERIF = "Noto Serif";
const SERIF_ITALIC = "Noto Serif Italic";
const DEVANAGARI = "Noto Sans Devanagari";

let fontsReady = false;

function asset(...parts: string[]): string {
  return path.join(process.cwd(), "assets", "reel", ...parts);
}

function ensureFonts(): void {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(asset("fonts", "NotoSerif-Regular.ttf"), SERIF);
  GlobalFonts.registerFromPath(
    asset("fonts", "NotoSerif-Italic.ttf"),
    SERIF_ITALIC
  );
  GlobalFonts.registerFromPath(
    asset("fonts", "NotoSansDevanagari-Medium.ttf"),
    DEVANAGARI
  );
  fontsReady = true;
}

function ffmpegBin(): string {
  if (!ffmpegStatic) {
    throw new Error("ffmpeg binary is not available");
  }
  return ffmpegStatic;
}

function tracked(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  gap: number
): void {
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + gap;
  }
}

function wrap(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) {
      current = trial;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function paintBase(): SKRSContext2D {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.filter = "blur(70px)";
  ctx.fillStyle = "rgba(8, 42, 52, 0.59)";
  ctx.beginPath();
  ctx.ellipse(540, 430, 460, 390, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(12, 56, 64, 0.35)";
  ctx.beginPath();
  ctx.ellipse(540, 410, 280, 230, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = "none";
  return ctx;
}

function lotusMark(src: Image): Canvas {
  const cropW = 660;
  const cropH = 215;
  const crop = createCanvas(cropW, cropH);
  const cropCtx = crop.getContext("2d");
  cropCtx.drawImage(src, 190, 330, cropW, cropH, 0, 0, cropW, cropH);
  const image = cropCtx.getImageData(0, 0, cropW, cropH);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] ?? 0;
    const g = px[i + 1] ?? 0;
    const b = px[i + 2] ?? 0;
    if ((r < 28 && g < 40 && b < 48) || r < 90) px[i + 3] = 0;
  }
  cropCtx.putImageData(image, 0, 0);

  const width = 210;
  const height = Math.round((width * cropH) / cropW);
  const out = createCanvas(width, height);
  const outCtx = out.getContext("2d");
  outCtx.imageSmoothingEnabled = true;
  outCtx.drawImage(crop, 0, 0, width, height);
  return out;
}

function drawLockup(ctx: SKRSContext2D, artwork: Image): void {
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(artwork, 0, (H - W) / 2, W, W);
}

function fitLines(
  ctx: SKRSContext2D,
  family: string,
  lines: string[],
  start: number,
  min: number
): number {
  let size = start;
  while (size > min) {
    ctx.font = `${size}px "${family}"`;
    if (lines.every((line) => ctx.measureText(line).width <= COL_W)) break;
    size -= 1;
  }
  ctx.font = `${size}px "${family}"`;
  return size;
}

async function renderFrames(dir: string, sloka: Sloka, ref: string): Promise<void> {
  ensureFonts();
  const artwork = await loadImage(asset("lockup.jpg"));
  const lotus = lotusMark(artwork);

  const intro = createCanvas(W, H);
  const introCtx = intro.getContext("2d");
  introCtx.fillStyle = BG;
  introCtx.fillRect(0, 0, W, H);
  drawLockup(introCtx, artwork);
  await writeFile(path.join(dir, "01-intro.png"), intro.toBuffer("image/png"));

  const verse = paintBase();
  const canvas = verse.canvas;
  verse.drawImage(lotus, (W - lotus.width) / 2, 86);
  verse.textBaseline = "top";
  verse.fillStyle = BRASS;
  verse.font = `22px "${SERIF}"`;
  tracked(verse, "MINDKSHETRA  ·  VERSE OF THE DAY", COL_X, 250, 2.2);

  verse.fillStyle = CREAM;
  verse.font = `72px "${SERIF}"`;
  verse.fillText(ref, COL_X, 300);

  const sanskrit = sanskritLines(sloka.sanskrit_devanagari);
  const devSize = fitLines(verse, DEVANAGARI, sanskrit, 52, 32);
  verse.fillStyle = BRASS;
  verse.font = `22px "${SERIF}"`;
  tracked(verse, "SANSKRIT", COL_X, 430, 2.4);

  let y = 476;
  verse.fillStyle = CREAM;
  verse.font = `${devSize}px "${DEVANAGARI}"`;
  const devLeading = Math.round(devSize * 1.75);
  for (const line of sanskrit) {
    verse.fillText(line, COL_X, y);
    y += devLeading;
  }

  y += 36;
  verse.fillStyle = BRASS;
  verse.font = `22px "${SERIF}"`;
  tracked(verse, "TRANSLITERATION", COL_X, y, 2.4);
  y += 46;

  let iastSize = 34;
  verse.font = `${iastSize}px "${SERIF_ITALIC}"`;
  let roman = wrap(verse, sloka.transliteration_iast, COL_W);
  while (
    iastSize > 26 &&
    roman.some((line) => verse.measureText(line).width > COL_W)
  ) {
    iastSize -= 1;
    verse.font = `${iastSize}px "${SERIF_ITALIC}"`;
    roman = wrap(verse, sloka.transliteration_iast, COL_W);
  }
  verse.fillStyle = MUTED;
  const iastLeading = Math.max(44, Math.round(iastSize * 1.5));
  for (const line of roman) {
    verse.fillText(line, COL_X, y);
    y += iastLeading;
  }

  const ruleY = Math.max(1040, y + 28);
  verse.fillStyle = BRASS_DIM;
  verse.fillRect(COL_X, ruleY, 180, 1);

  let englishSize = 40;
  let englishLeading = 58;
  const footerY = 1760;
  const labelGap = 46;
  verse.font = `${englishSize}px "${SERIF}"`;
  let english = wrap(verse, sloka.english_translation, COL_W);
  while (englishSize > 26) {
    const block = labelGap + english.length * englishLeading;
    const overflows = english.some(
      (line) => verse.measureText(line).width > COL_W
    );
    if (!overflows && ruleY + 40 + block < footerY - 16) break;
    englishSize -= 2;
    englishLeading = Math.round(englishSize * 1.45);
    verse.font = `${englishSize}px "${SERIF}"`;
    english = wrap(verse, sloka.english_translation, COL_W);
  }

  let ey = ruleY + 40;
  verse.fillStyle = BRASS;
  verse.font = `22px "${SERIF}"`;
  tracked(verse, "ENGLISH", COL_X, ey, 2.4);
  ey += labelGap;
  verse.fillStyle = CREAM;
  verse.font = `${englishSize}px "${SERIF}"`;
  for (const line of english) {
    verse.fillText(line, COL_X, ey);
    ey += englishLeading;
  }

  const foot = ey + 28 < footerY ? footerY : ey + 28;
  if (foot < H - 48) {
    verse.fillStyle = BRASS;
    verse.font = `28px "${SERIF}"`;
    verse.fillText("Go deeper in the MindKshetra app", COL_X, foot);
  }

  await writeFile(path.join(dir, "02-verse.png"), canvas.toBuffer("image/png"));

  const end = createCanvas(W, H);
  const endCtx = end.getContext("2d");
  endCtx.fillStyle = BG;
  endCtx.fillRect(0, 0, W, H);
  drawLockup(endCtx, artwork);
  endCtx.textBaseline = "top";
  endCtx.fillStyle = MUTED;
  endCtx.font = `30px "${SERIF}"`;
  const store = "Available on iOS and Android";
  endCtx.fillText(store, (W - endCtx.measureText(store).width) / 2, 1560);
  endCtx.fillStyle = BRASS;
  endCtx.font = `32px "${SERIF}"`;
  const stores = "App Store    ·    Google Play";
  endCtx.fillText(stores, (W - endCtx.measureText(stores).width) / 2, 1630);
  await writeFile(path.join(dir, "05-end.png"), end.toBuffer("image/png"));
}

async function probeDuration(
  file: string,
  signal?: AbortSignal
): Promise<number> {
  let stderr = "";
  try {
    const out = await execFileAsync(
      ffmpegBin(),
      ["-hide_banner", "-i", file, "-f", "null", "-"],
      { encoding: "utf8", signal }
    );
    stderr = out.stderr;
  } catch (err) {
    stderr = (err as { stderr?: string }).stderr ?? "";
  }
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  if (!match) throw new Error("Could not read the recitation duration");
  return (
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
  );
}

function encodeArgs(dir: string, timeline: ReelTimeline): string[] {
  const delay = Math.round(timeline.audioDelay * 1000);
  const n = (value: number) => value.toFixed(3);
  return [
    "-y",
    "-loop", "1", "-framerate", "30", "-t", n(timeline.intro),
    "-i", path.join(dir, "01-intro.png"),
    "-loop", "1", "-framerate", "30", "-t", n(timeline.verse),
    "-i", path.join(dir, "02-verse.png"),
    "-loop", "1", "-framerate", "30", "-t", n(timeline.end),
    "-i", path.join(dir, "05-end.png"),
    "-i", path.join(dir, "recitation.m4a"),
    "-filter_complex",
    [
      "[0:v]format=yuv420p,setsar=1[v0]",
      "[1:v]format=yuv420p,setsar=1[v1]",
      "[2:v]format=yuv420p,setsar=1[v2]",
      `[v0][v1]xfade=transition=fade:duration=${n(timeline.xfade)}:offset=${n(timeline.offset1)}[x1]`,
      `[x1][v2]xfade=transition=fade:duration=${n(timeline.xfade)}:offset=${n(timeline.offset2)}[v]`,
      `[3:a]adelay=${delay}|${delay},afade=t=in:st=${n(timeline.audioDelay)}:d=${n(timeline.fadeIn)},afade=t=out:st=${n(timeline.fadeOut)}:d=${n(timeline.fadeOutDur)},apad=whole_dur=${n(timeline.total + 0.5)}[a]`,
    ].join(";"),
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-crf", "18",
    "-preset", "veryfast",
    "-tune", "stillimage",
    "-c:a", "aac",
    "-b:a", "160k",
    "-movflags", "+faststart",
    path.join(dir, "reel.mp4"),
  ];
}

/** Paint the approved dark reel and mux today's recitation under the verse card. */
export async function renderVotdReel(input: {
  sloka: Sloka;
  ref: string;
  audio: Buffer;
  signal?: AbortSignal;
}): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "votd-reel-"));
  const execOpts = { maxBuffer: 8 * 1024 * 1024, signal: input.signal };
  try {
    const audioPath = path.join(dir, "recitation.m4a");
    await writeFile(audioPath, input.audio);
    await renderFrames(dir, input.sloka, input.ref);
    const duration = await probeDuration(audioPath, input.signal);
    await execFileAsync(
      ffmpegBin(),
      encodeArgs(dir, reelTimeline(duration)),
      execOpts
    );
    return await readFile(path.join(dir, "reel.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
