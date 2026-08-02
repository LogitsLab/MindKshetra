/**
 * Pre-generates narration audio with Sarvam TTS for every fixed spoken string
 * in the product — verse translations (EN/HI) and meditation/journey phase
 * texts — and uploads m4a files to Supabase Storage keyed by speech-text
 * hash. Clients hash the text they are about to speak and play the file when
 * present, so re-running this script after content changes upgrades audio
 * with no client release.
 *
 * Usage:
 *   node scripts/audio/generate-tts.mjs [--only=verses|meditation] [--limit=N] [--dry-run]
 *
 * Requires: SARVAM_API_KEY in .env, ffmpeg on PATH (concat + m4a encode),
 * Supabase service env. Resumable: existing manifest entries are skipped.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import { speechHash, normalizeSpeechText } from "./hash.mjs";
import { sarvamConfigured, sarvamTtsChunk, splitForTts } from "./sarvam.mjs";
import {
  adminClient,
  ensureBucket,
  loadManifest,
  saveManifest,
  uploadFile,
  loadEnv,
} from "./storage.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

/** Every fixed string a client can speak, tagged with its language. */
function collectTexts() {
  const texts = { en: new Map(), hi: new Map() };
  const add = (lang, text, label) => {
    const normalized = normalizeSpeechText(String(text ?? ""));
    if (normalized.length < 2) return;
    const hash = speechHash(normalized);
    if (!texts[lang].has(hash)) texts[lang].set(hash, { text: normalized, label });
  };

  if (!args.only || args.only === "verses") {
    const slokas = JSON.parse(readFileSync("data/slokas.json", "utf8"));
    for (const s of slokas) {
      add("en", s.english_translation, `verse ${s.chapter}.${s.verse_number} en`);
      add("hi", s.hindi_translation, `verse ${s.chapter}.${s.verse_number} hi`);
    }
  }

  if (!args.only || args.only === "meditation") {
    // Any text_en/text_hi field anywhere in the journey data is speakable.
    const walk = (node, label) => {
      if (Array.isArray(node)) {
        node.forEach((item, i) => walk(item, `${label}[${i}]`));
      } else if (node && typeof node === "object") {
        if (typeof node.text_en === "string") add("en", node.text_en, label);
        if (typeof node.text_hi === "string") add("hi", node.text_hi, label);
        for (const [k, v] of Object.entries(node)) walk(v, `${label}.${k}`);
      }
    };
    for (const file of readdirSync("data/journeys")) {
      if (!file.endsWith(".json")) continue;
      walk(JSON.parse(readFileSync(join("data/journeys", file), "utf8")), file);
    }
  }
  return texts;
}

function wavChunksToM4a(chunks) {
  const dir = mkdtempSync(join(tmpdir(), "mk-tts-"));
  try {
    const listPath = join(dir, "list.txt");
    const lines = chunks.map((buf, i) => {
      const p = join(dir, `${i}.wav`);
      writeFileSync(p, buf);
      return `file '${p}'`;
    });
    writeFileSync(listPath, lines.join("\n"));
    const out = join(dir, "out.m4a");
    execFileSync(
      "ffmpeg",
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "aac", "-b:a", "64k", out],
      { stdio: "pipe" }
    );
    return readFileSync(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  loadEnv();
  if (!sarvamConfigured()) {
    console.error(
      "SARVAM_API_KEY is not set. Create a free key at https://dashboard.sarvam.ai and add it to .env."
    );
    process.exit(1);
  }

  const supabase = adminClient();
  await ensureBucket(supabase);
  const manifest = await loadManifest(supabase);
  const texts = collectTexts();

  const limit = args.limit ? Number(args.limit) : Infinity;
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const lang of ["en", "hi"]) {
    for (const [hash, { text, label }] of texts[lang]) {
      if (manifest.tts[lang][hash]) {
        skipped += 1;
        continue;
      }
      if (generated >= limit) continue;
      if (args["dry-run"]) {
        console.log(`[dry] ${lang} ${label} (${text.length} chars) -> ${hash}`);
        generated += 1;
        continue;
      }
      try {
        const chunks = [];
        for (const piece of splitForTts(text)) {
          chunks.push(await sarvamTtsChunk(piece, lang));
        }
        const m4a = wavChunksToM4a(chunks);
        const path = `tts/${lang}/${hash}.m4a`;
        await uploadFile(supabase, path, m4a, "audio/mp4");
        manifest.tts[lang][hash] = path;
        generated += 1;
        console.log(`[ok] ${lang} ${label} -> ${path} (${m4a.length} bytes)`);
        // Persist progress every 25 files so an interruption resumes cleanly.
        if (generated % 25 === 0) await saveManifest(supabase, manifest);
      } catch (err) {
        failed += 1;
        console.error(`[fail] ${lang} ${label}: ${err.message}`);
        if (failed > 10) {
          console.error("Too many failures — stopping. Manifest saved for resume.");
          break;
        }
      }
    }
  }

  manifest.voice = {
    provider: "sarvam",
    model: process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v2",
    speaker: process.env.SARVAM_TTS_SPEAKER?.trim() || "anushka",
  };
  if (!args["dry-run"]) await saveManifest(supabase, manifest);
  console.log(
    `done: generated=${generated} skipped(existing)=${skipped} failed=${failed}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
