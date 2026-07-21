#!/usr/bin/env node
/**
 * Seed slokas, tags, moods into Supabase.
 * Run: npm run db:seed
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

const slokas = require("../data/slokas.json");

const moods = [
  { id: "anxious", label: "Anxious", labelHi: "चिंतित", tags: ["anxiety_fear", "overwhelm_burnout", "control_of_mind"] },
  { id: "sad", label: "Sad", labelHi: "उदास", tags: ["grief_loss", "loneliness", "gratitude_contentment"] },
  { id: "angry", label: "Angry", labelHi: "क्रोधित", tags: ["anger", "control_of_mind", "relationships_conflict"] },
  { id: "confused", label: "Confused", labelHi: "उलझन में", tags: ["confusion_decision", "purpose_meaning", "duty_responsibility"] },
  { id: "grieving", label: "Grieving", labelHi: "शोक में", tags: ["grief_loss", "impermanence_mortality", "equanimity"] },
  { id: "lonely", label: "Lonely", labelHi: "अकेला", tags: ["loneliness", "devotion_surrender", "purpose_meaning"] },
  { id: "overwhelmed", label: "Overwhelmed", labelHi: "अभिभूत", tags: ["overwhelm_burnout", "action_without_attachment", "equanimity"] },
  { id: "guilty", label: "Guilty", labelHi: "दोषी", tags: ["guilt", "duty_responsibility", "action_without_attachment"] },
  { id: "jealous", label: "Jealous", labelHi: "ईर्ष्यालु", tags: ["jealousy_comparison", "ego_pride", "detachment"] },
  { id: "unmotivated", label: "Unmotivated", labelHi: "निष्क्रिय", tags: ["unmotivated", "courage", "duty_responsibility", "low_self_worth"] },
  { id: "fearful", label: "Fearful", labelHi: "भयभीत", tags: ["anxiety_fear", "courage", "hope"] },
  { id: "hopeful", label: "Hopeful", labelHi: "आशावान", tags: ["hope", "gratitude_contentment", "purpose_meaning"] },
  { id: "grateful", label: "Grateful", labelHi: "कृतज्ञ", tags: ["gratitude_contentment", "devotion_surrender", "equanimity"] },
  { id: "big-decision", label: "Facing a big decision", labelHi: "बड़े निर्णय पर", tags: ["confusion_decision", "duty_responsibility", "courage"] },
  { id: "conflict", label: "Going through conflict", labelHi: "संघर्ष में", tags: ["relationships_conflict", "anger", "equanimity"] },
  { id: "failure", label: "Feeling like a failure", labelHi: "असफलता का भाव", tags: ["low_self_worth", "courage", "action_without_attachment"] },
  { id: "purpose", label: "Searching for purpose", labelHi: "उद्देश्य खोजते", tags: ["purpose_meaning", "duty_responsibility", "devotion_surrender", "courage"] },
  { id: "happy", label: "Happy", labelHi: "प्रसन्न", tags: ["gratitude_contentment", "equanimity", "detachment"] },
];

async function main() {
  console.log(`Seeding ${slokas.length} slokas...`);

  for (let i = 0; i < slokas.length; i += 50) {
    const batch = slokas.slice(i, i + 50).map((s) => ({
      id: s.id,
      chapter: s.chapter,
      verse_number: s.verse_number,
      sanskrit_devanagari: s.sanskrit_devanagari,
      transliteration_iast: s.transliteration_iast,
      hindi_translation: s.hindi_translation,
      english_translation: s.english_translation,
      english_meaning: s.english_meaning || null,
      hindi_meaning: s.hindi_meaning || null,
      word_meanings: s.word_meanings || null,
    }));
    const { error } = await supabase.from("slokas").upsert(batch);
    if (error) throw error;
    process.stdout.write(".");
  }
  console.log("\nSlokas done.");

  const tagNames = new Set();
  for (const s of slokas) {
    for (const t of s.tags || []) tagNames.add(t);
  }

  const tagRows = Array.from(tagNames).map((name) => ({
    name,
    category: "emotion",
  }));
  const { error: tagErr } = await supabase
    .from("tags")
    .upsert(tagRows, { onConflict: "name" });
  if (tagErr) throw tagErr;

  const { data: tags } = await supabase.from("tags").select("id, name");
  const tagMap = new Map((tags || []).map((t) => [t.name, t.id]));

  const links = [];
  for (const s of slokas) {
    for (const t of s.tags || []) {
      const tagId = tagMap.get(t);
      if (tagId) links.push({ sloka_id: s.id, tag_id: tagId });
    }
  }

  for (let i = 0; i < links.length; i += 200) {
    const { error } = await supabase
      .from("sloka_tags")
      .upsert(links.slice(i, i + 200));
    if (error) throw error;
  }
  console.log(`Tags: ${tagNames.size}, links: ${links.length}`);

  const moodRows = moods.map((m, idx) => ({
    id: m.id,
    label: m.label,
    label_hi: m.labelHi,
    sort_order: idx,
  }));
  const { error: moodErr } = await supabase.from("moods").upsert(moodRows);
  if (moodErr) throw moodErr;

  const moodTagRows = [];
  for (const m of moods) {
    for (const t of m.tags) {
      moodTagRows.push({ mood_id: m.id, tag_name: t });
    }
  }
  const { error: mtErr } = await supabase.from("mood_tags").upsert(moodTagRows);
  if (mtErr) throw mtErr;
  console.log(`Moods: ${moods.length}`);

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
