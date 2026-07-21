#!/usr/bin/env node
/**
 * Generate and store Voyage embeddings for all slokas.
 * Run: npm run db:embeddings
 *
 * Free-tier (no payment method): ~3 RPM — script throttles + retries 429s.
 */
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT, ".env.local") });
require("dotenv").config({ path: path.join(ROOT, ".env") });

const MODEL = "voyage-3";
const BATCH = 8;
/** Free tier without card is ~3 RPM — wait ~22s between batches */
const DELAY_MS = Number(process.env.EMBED_DELAY_MS || 22_000);
const MAX_RETRIES = 6;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedBatch(texts, key) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: MODEL,
        input_type: "document",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data.map((d) => d.embedding);
    }
    const body = await res.text();
    lastErr = new Error(`Voyage ${res.status}: ${body}`);
    if (res.status === 429) {
      const wait = DELAY_MS * (attempt + 1);
      process.stdout.write(`\n[rate limit] waiting ${Math.round(wait / 1000)}s… `);
      await sleep(wait);
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

function buildText(s) {
  const ref = `${s.chapter}.${s.verse_number}`;
  const tags = (s.tags || []).map((t) => t.replace(/_/g, " ")).join(", ");
  return `${ref} | ${s.english_translation} | ${s.hindi_translation} | ${tags}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const voyageKey = process.env.VOYAGE_API_KEY?.trim();
  if (!url || !sbKey || !voyageKey) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(url, sbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const slokas = require("../data/slokas.json");

  const { data: existing, error: exErr } = await supabase
    .from("sloka_embeddings")
    .select("sloka_id");
  if (exErr) throw exErr;
  const done = new Set((existing ?? []).map((r) => r.sloka_id));
  const pending = slokas.filter((s) => !done.has(s.id));

  console.log(
    `Embedding ${pending.length} of ${slokas.length} verses (skipping ${done.size} already done).`
  );
  console.log(
    `Batch=${BATCH}, delay=${DELAY_MS}ms (free tier ~3 RPM). Est. ~${Math.ceil((pending.length / BATCH) * (DELAY_MS / 60000))} min.\n`
  );

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const texts = batch.map(buildText);
    const embeddings = await embedBatch(texts, voyageKey);
    const rows = batch.map((s, j) => ({
      sloka_id: s.id,
      embedding: embeddings[j],
      model: MODEL,
    }));
    const { error } = await supabase
      .from("sloka_embeddings")
      .upsert(rows, { onConflict: "sloka_id" });
    if (error) throw error;
    const finished = Math.min(i + BATCH, pending.length);
    process.stdout.write(`${finished}/${pending.length} `);
    if (i + BATCH < pending.length) await sleep(DELAY_MS);
  }
  console.log(`\nDone. Embedded ${pending.length} verses (${done.size + pending.length} total).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
