/**
 * Fetches per-verse Sanskrit recitation audio from a licensed source and
 * uploads it to the audio bucket keyed "chapter-verse".
 *
 * LICENSING GATE — read docs/audio.md first. This script refuses to run
 * without --attribution and --license flags: recordings such as IIT Kanpur's
 * Gita Supersite are copyrighted and need written permission before
 * redistribution in this app. The flags exist so consent is recorded in the
 * manifest, visible to every future maintainer.
 *
 * Usage:
 *   node scripts/audio/fetch-recitation.mjs \
 *     --pattern="https://example.org/audio/{chapter}-{verse}.mp3" \
 *     --attribution="Recitation courtesy of X" \
 *     --license="Written permission from Y, 2026-08-02" \
 *     [--chapters=1-18] [--limit=N] [--dry-run]
 *
 * {chapter} and {verse} in the pattern are replaced per verse. Files are
 * validated as real audio (magic bytes), re-encoded to m4a via ffmpeg, and
 * uploaded. Resumable: existing manifest entries are skipped.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.length ? rest.join("=") : true];
  })
);

/**
 * With --wayback, the pattern is the ORIGINAL host URL and each verse is
 * resolved through the Internet Archive's CDX index to whichever capture
 * actually exists — coverage varies per file, so a fixed snapshot date
 * misses verses that were crawled in other years.
 */
async function waybackResolve(originalUrl) {
  const cdx =
    "https://web.archive.org/cdx/search/cdx?output=json&limit=-1" +
    "&filter=statuscode:200&fl=timestamp&url=" +
    encodeURIComponent(originalUrl);
  const res = await fetch(cdx, {
    headers: { "User-Agent": "MindKshetra-audio-pipeline (non-profit)" },
  });
  if (!res.ok) throw new Error(`CDX ${res.status}`);
  const rows = await res.json();
  const timestamp = rows?.[1]?.[0];
  if (!timestamp) throw new Error("no archived capture");
  return `https://web.archive.org/web/${timestamp}id_/${originalUrl}`;
}

function isRealAudio(buffer) {
  if (buffer.length < 128) return false;
  const head = buffer.subarray(0, 12);
  const ascii = head.toString("latin1");
  return (
    ascii.startsWith("ID3") || // mp3 with tags
    (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) || // raw mpeg frame
    ascii.startsWith("RIFF") || // wav
    ascii.includes("ftyp") || // m4a/mp4
    ascii.startsWith("OggS") // ogg
  );
}

function toM4a(buffer) {
  const dir = mkdtempSync(join(tmpdir(), "mk-recit-"));
  try {
    const src = join(dir, "in.bin");
    const out = join(dir, "out.m4a");
    writeFileSync(src, buffer);
    execFileSync(
      "ffmpeg",
      ["-y", "-i", src, "-c:a", "aac", "-b:a", "80k", out],
      { stdio: "pipe" }
    );
    return readFileSync(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  loadEnv();
  if (!args.pattern || args.attribution === undefined || args.license === undefined) {
    console.error(
      "Refusing to run: --pattern, --attribution and --license are required.\n" +
        "Recitation audio must have documented permission before it ships in the\n" +
        "app — see docs/audio.md for the outreach template."
    );
    process.exit(1);
  }

  const slokas = JSON.parse(readFileSync("data/slokas.json", "utf8"));
  const [chapFrom, chapTo] = String(args.chapters ?? "1-18")
    .split("-")
    .map(Number);
  const limit = args.limit ? Number(args.limit) : Infinity;

  const supabase = adminClient();
  await ensureBucket(supabase);
  const manifest = await loadManifest(supabase);

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (const s of slokas) {
    if (s.chapter < chapFrom || s.chapter > (chapTo || chapFrom)) continue;
    const key = `${s.chapter}-${s.verse_number}`;
    if (manifest.recitation[key]) {
      skipped += 1;
      continue;
    }
    if (fetched >= limit) break;

    let url = args.pattern
      .replaceAll("{chapter}", String(s.chapter))
      .replaceAll("{verse}", String(s.verse_number));

    if (args["dry-run"]) {
      console.log(`[dry] ${key} <- ${url}`);
      fetched += 1;
      continue;
    }

    try {
      if (args.wayback) url = await waybackResolve(url);
      const res = await fetch(url, {
        headers: { "User-Agent": "MindKshetra-audio-pipeline (non-profit)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (!isRealAudio(buffer)) {
        throw new Error("response is not audio (soft-404 page?)");
      }
      const m4a = toM4a(buffer);
      const path = `recitation/${key}.m4a`;
      await uploadFile(supabase, path, m4a, "audio/mp4");
      manifest.recitation[key] = path;
      fetched += 1;
      console.log(`[ok] ${key} (${m4a.length} bytes)`);
      if (fetched % 25 === 0) await saveManifest(supabase, manifest);
      // Be polite to the source host.
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      failed += 1;
      console.error(`[fail] ${key}: ${err.message}`);
      const cap = args["max-failures"] ? Number(args["max-failures"]) : 10;
      if (failed > cap) {
        console.error("Too many failures — stopping (wrong pattern?).");
        break;
      }
    }
  }

  manifest.recitationSource = {
    attribution: String(args.attribution),
    license: String(args.license),
    pattern: String(args.pattern),
  };
  if (!args["dry-run"]) await saveManifest(supabase, manifest);
  console.log(`done: fetched=${fetched} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
