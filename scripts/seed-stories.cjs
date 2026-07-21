#!/usr/bin/env node
/**
 * Seed default stories from data/stories-seed.json into Supabase.
 * Run: node scripts/seed-stories.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT, ".env.local") });
require("dotenv").config({ path: path.join(ROOT, ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seedStories = require("../data/stories-seed.json");

async function main() {
  const rows = [];
  for (const [id, pair] of Object.entries(seedStories)) {
    if (!pair?.en?.trim() || !pair?.hi?.trim()) continue;
    rows.push(
      {
        sloka_id: Number(id),
        language: "en",
        story_text: pair.en.trim(),
        variant_index: 0,
      },
      {
        sloka_id: Number(id),
        language: "hi",
        story_text: pair.hi.trim(),
        variant_index: 0,
      }
    );
  }

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from("stories")
      .upsert(rows.slice(i, i + 100), {
        onConflict: "sloka_id,language,variant_index",
      });
    if (error) throw error;
    process.stdout.write(".");
  }
  console.log(`\nSeeded ${rows.length} story rows (${rows.length / 2} verses).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
