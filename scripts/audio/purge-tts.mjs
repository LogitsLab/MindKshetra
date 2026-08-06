#!/usr/bin/env node
/**
 * Delete AI/TTS narration from the public audio bucket; keep human Sanskrit
 * recitation + optional ambient. Clears manifest.tts so clients stop requesting
 * those URLs (device TTS remains as a free fallback for translations).
 *
 *   AUDIO_ENV_FILE=.env npm run audio:purge-tts -- --dry-run
 *   AUDIO_ENV_FILE=.env npm run audio:purge-tts -- --yes
 */
import {
  adminClient,
  ensureBucket,
  listAll,
  loadManifest,
  saveManifest,
  BUCKET,
} from "./storage.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const yes = args.includes("--yes");

async function deleteBatch(supabase, paths) {
  const chunk = 50;
  let deleted = 0;
  for (let i = 0; i < paths.length; i += chunk) {
    const slice = paths.slice(i, i + chunk);
    if (dryRun) {
      deleted += slice.length;
      continue;
    }
    const { error } = await supabase.storage.from(BUCKET).remove(slice);
    if (error) throw new Error(`remove failed: ${error.message}`);
    deleted += slice.length;
    process.stdout.write(`\r[audio] deleted ${deleted}/${paths.length}`);
  }
  if (paths.length) process.stdout.write("\n");
  return deleted;
}

async function main() {
  if (!dryRun && !yes) {
    console.error("Refuse to purge without --dry-run or --yes");
    process.exit(1);
  }

  const supabase = adminClient();
  await ensureBucket(supabase);
  console.log(
    `[audio] project ${process.env.NEXT_PUBLIC_SUPABASE_URL} bucket=${BUCKET}`
  );

  const en = await listAll(supabase, "tts/en");
  const hi = await listAll(supabase, "tts/hi");
  // Also catch any loose files directly under tts/
  const rootTts = (await listAll(supabase, "tts")).filter(
    (p) => p.endsWith(".m4a") && !p.includes("/en/") && !p.includes("/hi/")
  );
  const paths = [...en, ...hi, ...rootTts];
  console.log(
    `[audio] TTS objects: en=${en.length} hi=${hi.length} other=${rootTts.length} total=${paths.length}`
  );

  await deleteBatch(supabase, paths);

  const manifest = await loadManifest(supabase);
  const hadEn = Object.keys(manifest.tts?.en || {}).length;
  const hadHi = Object.keys(manifest.tts?.hi || {}).length;
  manifest.tts = { en: {}, hi: {} };
  manifest.voice = null;
  if (!dryRun) {
    await saveManifest(supabase, manifest);
  }
  console.log(
    `[audio] manifest tts cleared (was en=${hadEn} hi=${hadHi}); recitation kept=${Object.keys(manifest.recitation || {}).length}`
  );
  console.log(dryRun ? "[audio] dry-run only — nothing deleted" : "[audio] purge complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
