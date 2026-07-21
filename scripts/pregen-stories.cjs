#!/usr/bin/env node
/**
 * Pre-generate story variants 1–2 (bilingual) via Groq into Supabase.
 *
 * Usage:
 *   node scripts/pregen-stories.cjs --limit 5
 *   node scripts/pregen-stories.cjs --from 1 --limit 50
 *   node scripts/pregen-stories.cjs --variants 1,2
 *
 * Skips variants that already exist. Requires GROQ_API_KEY + Supabase service role.
 */
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT, ".env.local") });
require("dotenv").config({ path: path.join(ROOT, ".env") });

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL =
  process.env.GROQ_MODEL?.trim() || "qwen/qwen3.6-27b";
const DELAY_MS = Number(process.env.STORY_PREGEN_DELAY_MS || 1500);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const out = { limit: Infinity, from: 1, variants: [1, 2] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") out.limit = Number(argv[++i]);
    else if (argv[i] === "--from") out.from = Number(argv[++i]);
    else if (argv[i] === "--variants") {
      out.variants = String(argv[++i])
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => n >= 1 && n <= 5);
    }
  }
  return out;
}

function stripThink(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function formatRef(s) {
  return `${s.chapter}.${s.verse_number}`;
}

function buildStoryPrompt(sloka) {
  const tags = (sloka.tags || []).map((t) => t.replace(/_/g, " ")).join(", ");
  return `You are writing a short modern reflection (180-280 words) for a Bhagavad Gita reading app.

This is NOT a retelling of the Mahabharata or Kurukshetra. It is a contemporary scene whose emotional truth mirrors a teaching from the Gita.

Teaching passage ${formatRef(sloka)}:
${formatRef(sloka)} (focus): ${sloka.english_translation}

Theme tags: ${tags}

Write the story in natural English.

Write ONE modern, relatable scenario whose arc reflects the verse. Without naming verses, quoting Sanskrit, or being preachy. End with a single quiet line that lands the teaching. Keep it under 280 words. No title.

Do not include <think> tags or chain-of-thought — only the story text.`;
}

function buildTranslatePrompt(en) {
  return `Translate the following reflective story into natural Hindi (Devanagari).

Keep the SAME story: same characters, setting, events, and ending. Do not invent a new plot. Only change the language. No title, no preface.

Story:
${en}

Do not include <think> tags or chain-of-thought — only the Hindi story text.`;
}

async function groqComplete(apiKey, prompt, temperature) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      max_tokens: 900,
      stream: false,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body}`);
  }
  const data = await res.json();
  const text = stripThink(data.choices?.[0]?.message?.content ?? "");
  if (!text) throw new Error("Empty Groq story");
  return text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!url || !sbKey || !groqKey) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(url, sbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const all = require("../data/slokas.json");
  const candidates = all.filter(
    (s) => s.id >= args.from && Number.isFinite(s.id)
  );
  const targets = candidates.slice(0, args.limit);

  console.log(
    `Pregen variants [${args.variants.join(",")}] for ${targets.length} verses (from id ${args.from})…`
  );

  let generated = 0;
  let skipped = 0;

  for (const sloka of targets) {
    for (const variant of args.variants) {
      const { data: existing } = await supabase
        .from("stories")
        .select("sloka_id")
        .eq("sloka_id", sloka.id)
        .eq("language", "en")
        .eq("variant_index", variant)
        .maybeSingle();

      if (existing) {
        skipped++;
        process.stdout.write(`s${sloka.id}.v${variant} `);
        continue;
      }

      process.stdout.write(`g${sloka.id}.v${variant}…`);
      const en = await groqComplete(
        groqKey,
        buildStoryPrompt(sloka),
        0.85
      );
      await sleep(400);
      const hi = await groqComplete(groqKey, buildTranslatePrompt(en), 0.3);

      const { error } = await supabase.from("stories").upsert(
        [
          {
            sloka_id: sloka.id,
            language: "en",
            story_text: en,
            variant_index: variant,
          },
          {
            sloka_id: sloka.id,
            language: "hi",
            story_text: hi,
            variant_index: variant,
          },
        ],
        { onConflict: "sloka_id,language,variant_index" }
      );
      if (error) throw error;
      generated++;
      process.stdout.write("ok ");
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone. Generated ${generated}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
