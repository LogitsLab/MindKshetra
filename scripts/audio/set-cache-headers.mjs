#!/usr/bin/env node
/**
 * Re-upload existing objects with long-lived Cache-Control so Cloudflare can
 * edge-cache and stop burning Supabase egress on every Listen tap.
 *
 *   AUDIO_ENV_FILE=.env npm run audio:cache -- --dry-run
 *   AUDIO_ENV_FILE=.env npm run audio:cache -- --yes
 *   AUDIO_ENV_FILE=.env npm run audio:cache -- --yes --prefix=recitation
 */
import {
  adminClient,
  ensureBucket,
  listAll,
  uploadFile,
  CACHE_AUDIO,
  CACHE_MANIFEST,
  BUCKET,
} from "./storage.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const yes = args.includes("--yes");
const prefixArg = args.find((a) => a.startsWith("--prefix="));
const onlyPrefix = prefixArg ? prefixArg.slice("--prefix=".length) : null;

async function reupload(supabase, path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`download ${path}: ${error?.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  const contentType = path.endsWith(".json")
    ? "application/json"
    : "audio/mp4";
  const cache = path === "manifest.json" ? CACHE_MANIFEST : CACHE_AUDIO;
  if (dryRun) return buf.length;
  await uploadFile(supabase, path, buf, contentType, cache);
  return buf.length;
}

async function main() {
  if (!dryRun && !yes) {
    console.error("Refuse to rewrite without --dry-run or --yes");
    process.exit(1);
  }

  const supabase = adminClient();
  await ensureBucket(supabase);
  console.log(
    `[audio] project ${process.env.NEXT_PUBLIC_SUPABASE_URL} bucket=${BUCKET}`
  );

  const prefixes = onlyPrefix
    ? [onlyPrefix]
    : ["recitation", "ambient", ""];

  const paths = new Set();
  for (const prefix of prefixes) {
    if (prefix === "") {
      paths.add("manifest.json");
      continue;
    }
    for (const p of await listAll(supabase, prefix)) paths.add(p);
  }

  const list = [...paths];
  console.log(`[audio] rewriting cache headers on ${list.length} objects`);
  let bytes = 0;
  let done = 0;
  for (const path of list) {
    try {
      bytes += await reupload(supabase, path);
      done += 1;
      if (done % 25 === 0 || done === list.length) {
        process.stdout.write(
          `\r[audio] ${done}/${list.length} (${Math.round(bytes / 1024 / 1024)} MiB)`
        );
      }
    } catch (err) {
      console.error(`\n[audio] skip ${path}: ${err.message}`);
    }
  }
  process.stdout.write("\n");
  console.log(
    dryRun
      ? `[audio] dry-run — would rewrite ${done} objects`
      : `[audio] cache headers set (audio=${CACHE_AUDIO}s manifest=${CACHE_MANIFEST}s)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
