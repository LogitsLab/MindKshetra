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
// Keep in sync with lib/groq.ts GROQ_MODEL (was a stale qwen3.6 default).
const MODEL =
  process.env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b";
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
  // Remove complete reasoning blocks, then — if qwen spent its budget inside an
  // UNCLOSED <think> (no closing tag), drop everything from the opening tag on.
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const open = out.search(/<think>/i);
  if (open !== -1) out = out.slice(0, open);
  return out.replace(/<\/?think>/gi, "").trim();
}

// Mirror of lib/groq.ts looksDegenerate — catch the qwen repetition-loop
// failure mode (a 3-word shingle repeating many times) so a broken Hindi
// translation is never written to the DB.
function looksDegenerate(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 40) return false;
  const counts = new Map();
  for (let i = 0; i + 3 <= words.length; i++) {
    const key = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    const n = (counts.get(key) || 0) + 1;
    counts.set(key, n);
    if (n > 6) return true;
  }
  return false;
}

function formatRef(s) {
  return `${s.chapter}.${s.verse_number}`;
}

// Prompts below mirror lib/groq.ts (buildStoryPrompt / buildTranslateStoryPrompt)
// — that module is the source of truth. If you change the tone or rules there,
// change them here too. (TODO: converge on a single shared module so these can't
// drift, and iterate by passage anchor like the live route rather than per verse.)
const STORY_PERSONAS = [
  "a student the night before results",
  "a nurse at the end of a double shift",
  "a new parent awake at 3 a.m.",
  "a shopkeeper closing up alone",
  "someone caring for an ageing parent",
  "a delivery rider waiting out the rain",
  "a schoolteacher with one unreachable child",
  "someone a month into looking for work",
  "a sibling after an argument that never resolved",
  "a widow learning to cook for one",
  "a farmer watching the sky for rain",
  "a daughter who just moved back home",
];

function buildStoryPrompt(sloka, variant = 1) {
  const tags = (sloka.tags || []).map((t) => t.replace(/_/g, " ")).join(", ");
  const persona =
    STORY_PERSONAS[Math.abs(sloka.id + variant) % STORY_PERSONAS.length];
  return `You write short modern reflections for MindKshetra, a Bhagavad Gita reading app.

This is NOT a retelling of the Mahabharata or Kurukshetra. It is a contemporary scene whose emotional truth mirrors the teaching below.

Teaching passage ${formatRef(sloka)} (focus): ${sloka.english_translation}

Theme tags: ${tags}

Center the scene on ${persona} (or someone whose life rhymes with that). Do not fall back on a nameless "young professional".

Write ONE contemporary scene (220–320 words) in natural English that a tired, sincere adult can feel in their body. Give the person a specific life — a place, an hour, a gesture, one small sensory detail (a sound, a smell, the weight of something in the hand). Let it breathe in three movements: drop us into the moment, let the difficulty turn, then close as something quietly shifts.

Hard rules:
- NOT a Mahabharata / Kurukshetra retelling
- No Sanskrit, no chapter.verse citations, no "the Gita says", no moral spelled out
- Not preachy, not a worksheet, not bullet advice disguised as story
- No template openers ("On an ordinary weekday", "In a crowded room", "It feels a lot like…", "Imagine a…")
- End with ONE quiet, concrete line — an image or a small action the reader can carry, never a maxim

No title. No <think> tags — only the story text.`;
}

function buildTranslatePrompt(en) {
  return `Re-express the following reflection in natural, literary Hindi (Devanagari) — as if a thoughtful Hindi writer had written it first, not as a translation.

Keep the SAME content: same person, setting, events, turning point and ending. Do not invent a new plot, and do not add or drop scenes.

Make the Hindi genuinely read like Hindi:
- idiomatic Hindi rhythm and word order, never word-for-word from the English
- everyday Hindi an ordinary reader speaks; let Sanskrit/dharma words (धर्म, कर्म, मन, साधना) appear only where they fall naturally
- transliterate names and modern things the way a Hindi speaker would (फ़ोन, बस, दफ़्तर)
- keep the final line as quiet and concrete in Hindi as it is in English

Story:
${en}

No title, no preface, no English sentences. No <think> tags — only the Hindi story text.`;
}

async function groqComplete(apiKey, prompt, temperature) {
  let lastReason = "empty";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature,
        // Deeper stories + token-heavy Devanagari can overrun 900 and truncate.
        max_tokens: 1200,
        stream: false,
        // Without this, qwen3 spends the whole budget inside <think> and the
        // "story" is its reasoning dump (matches lib/groq.ts completeStory).
        reasoning_effort: "none",
        // Discourage the qwen repetition-loop failure mode on the Hindi pass.
        frequency_penalty: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq ${res.status}: ${body}`);
    }
    const data = await res.json();
    const text = stripThink(data.choices?.[0]?.message?.content ?? "");
    if (text && !looksDegenerate(text)) return text;
    lastReason = text ? "degenerate" : "empty";
  }
  throw new Error(`Groq story generation failed (${lastReason})`);
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
        buildStoryPrompt(sloka, variant),
        0.85
      );
      await sleep(400);
      const hi = await groqComplete(groqKey, buildTranslatePrompt(en), 0.4);

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
