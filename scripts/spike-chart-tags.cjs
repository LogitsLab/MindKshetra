#!/usr/bin/env node
/**
 * eng/E4 — validation spike.
 *
 * Question: does injecting chart-derived tags actually change which verses a
 * user is shown, ON THE REAL PRODUCTION PATH (Supabase + Voyage embeddings)?
 *
 * This matters because the whole Gita x Jyotish integration rests on it, and
 * the answer differs by an order of magnitude between modes:
 *
 *   tag-only mode   (CONTENT_SOURCE=json, or no Voyage key)
 *     the `* 0.3` tag weight is applied uniformly to every tag result, so it
 *     does not change tag-internal ranking at all — chart tags fully drive
 *     selection.
 *
 *   hybrid mode     (CONTENT_SOURCE=db + VOYAGE_API_KEY + embeddings)
 *     vector similarity enters at `* 0.7 * 10` alongside tags at `* 0.3`, so
 *     the user's own words compete with the chart.
 *
 * Run: node scripts/spike-chart-tags.cjs
 * Costs Voyage embedding calls (one per probe).
 */
const path = require("path");
const { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
// Same env precedence as scripts/eval-retrieve.cjs, so the spike sees the same
// CONTENT_SOURCE / VOYAGE_API_KEY the eval does. Without this it silently runs
// in tag-only mode and reports a number that does not describe production.
require("dotenv").config({ path: path.join(ROOT, ".env.local") });
require("dotenv").config({ path: path.join(ROOT, ".env") });

const runner = `
// lib/content/db.ts imports "server-only", a build-time marker package that has
// no runtime resolution outside Next's bundler. Stub it so this spike can
// exercise the REAL lib/retrieve.ts (including the vector arm) rather than a
// reimplementation that might drift from it.
const Module = require("module");
const _resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return require.resolve("node:util");
  return _resolve.call(this, request, ...rest);
};

const { retrieveSlokas } = require("${ROOT}/lib/retrieve");
const { LIFE_AREA_TAGS } = require("${ROOT}/lib/bridge/chart-to-verse");

const PROBES = [
  { q: "I feel stuck and I don't know what to do", area: "career" },
  { q: "things have been hard lately", area: "marriage" },
  { q: "I am worried about the future", area: "finance" },
  { q: "everything feels heavy", area: "health" },
];

const ref = (s) => \`\${s.chapter}.\${s.verse_number}\`;

(async () => {
  const mode =
    process.env.CONTENT_SOURCE === "db" && process.env.VOYAGE_API_KEY
      ? "HYBRID (vector + tags) — production shape"
      : "TAG-ONLY — no vector arm";
  console.log("mode:", mode);
  console.log("");

  let moved = 0, primaryChanged = 0, overlapTotal = 0;

  // Voyage rate-limits hard (429). Without spacing, the second call of a pair
  // silently falls back to tag-only and the comparison becomes hybrid-vs-tags
  // instead of chart-off-vs-chart-on — a contaminated result that looks fine.
  const delayMs = Number(process.env.SPIKE_VOYAGE_DELAY_MS || 24000);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const p of PROBES) {
    const a = (await retrieveSlokas(p.q, 5)).map(ref);
    await sleep(delayMs);
    const b = (await retrieveSlokas(p.q, 5, LIFE_AREA_TAGS[p.area])).map(ref);
    await sleep(delayMs);
    const overlap = a.filter((r) => b.includes(r)).length;
    if (overlap < a.length) moved++;
    if (a[0] !== b[0]) primaryChanged++;
    overlapTotal += overlap;
    console.log(\`[\${p.area}] "\${p.q}"\`);
    console.log("   without chart:", a.join(", "));
    console.log("   with chart:   ", b.join(", "));
    console.log(
      \`   overlap \${overlap}/5 · primary \${a[0] !== b[0] ? "CHANGED" : "unchanged"}\`
    );
    console.log("");
  }

  console.log("─".repeat(64));
  console.log(
    \`RESULT: \${moved}/\${PROBES.length} probes moved · \` +
      \`\${primaryChanged}/\${PROBES.length} primary changed · \` +
      \`avg overlap \${(overlapTotal / PROBES.length).toFixed(1)}/5\`
  );
  console.log("─".repeat(64));
})();
`;

const r = spawnSync("npx", ["--yes", "tsx", "-e", runner], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 0);
