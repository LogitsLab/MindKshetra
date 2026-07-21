#!/usr/bin/env node
/**
 * Eval for Explore search + Madhav retrieve ranking + citation gating.
 * Run: npm run eval
 */
const slokas = require("../data/slokas.json");

// ——— Search cases ———
const SEARCH_CASES = [
  { q: "fear", expectTags: ["anxiety_fear"], expectAnyRef: ["2.3", "11.33", "18.66"] },
  { q: "anger", expectTags: ["anger"], expectAnyRef: ["2.62", "2.63", "16.21"] },
  { q: "duty", expectTags: ["duty_responsibility"], expectAnyRef: ["2.47", "3.19", "18.47"] },
  { q: "grief", expectTags: ["grief_loss"], expectAnyRef: ["2.11", "2.13", "2.27"] },
  { q: "peace", expectTags: ["equanimity"], expectAnyRef: ["2.48", "2.56", "5.12"] },
  { q: "jealousy", expectTags: ["jealousy_comparison"], expectAnyRef: ["12.13", "12.15"] },
  { q: "lonely", expectTags: ["loneliness"], expectAnyRef: ["6.5", "12.13"] },
  { q: "2.47", expectExact: "2.47" },
  { q: "18.66", expectExact: "18.66" },
  { q: "शांति", expectAnyRef: ["2.48", "2.56", "5.29", "6.15"] },
];

// ——— Madhav retrieve cases (query → expected mood tags and/or canonical refs) ———
const RETRIEVE_CASES = [
  { q: "I am terrified about tomorrow", expectTags: ["anxiety_fear"], expectAnyRef: ["2.3", "11.33", "18.66", "2.7"] },
  { q: "I lost someone I love and cannot stop crying", expectTags: ["grief_loss"], expectAnyRef: ["2.11", "2.13", "2.27", "2.14"] },
  { q: "I keep exploding with rage at my family", expectTags: ["anger"], expectAnyRef: ["2.62", "2.63", "16.21"] },
  { q: "I don't know which job to choose", expectTags: ["confusion_decision", "duty_responsibility"], expectAnyRef: ["2.47", "3.19", "18.47"] },
  { q: "I feel burned out and overwhelmed at work", expectTags: ["overwhelm_burnout"], expectAnyRef: ["2.14", "6.5", "6.6"] },
  { q: "I feel completely alone", expectTags: ["loneliness"], expectAnyRef: ["6.5", "12.13", "9.22"] },
  { q: "I feel guilty about a mistake I made", expectTags: ["guilt"], expectAnyRef: ["9.30", "18.66", "4.36"] },
  { q: "Everyone else seems more successful than me", expectTags: ["jealousy_comparison", "success_ambition"], expectAnyRef: ["12.13", "12.15", "2.47"] },
  { q: "I feel worthless and like a failure", expectTags: ["low_self_worth"], expectAnyRef: ["2.3", "6.5", "9.30"] },
  { q: "I can't stop craving things I don't need", expectTags: ["attachment_desire"], expectAnyRef: ["2.58", "2.62", "2.70"] },
  { q: "How do I let go of attachment?", expectTags: ["detachment", "attachment_desire"], expectAnyRef: ["2.47", "2.71", "5.10"] },
  { q: "I need courage to stand up for what is right", expectTags: ["courage"], expectAnyRef: ["2.3", "2.37", "11.33"] },
  { q: "My mind will not stay still during meditation", expectTags: ["control_of_mind"], expectAnyRef: ["6.5", "6.6", "6.26", "6.35"] },
  { q: "I am obsessed with career success", expectTags: ["success_ambition"], expectAnyRef: ["2.47", "2.48", "3.19"] },
  { q: "My partner and I keep fighting", expectTags: ["relationships_conflict", "anger"], expectAnyRef: ["2.62", "2.63", "12.13"] },
  { q: "I want to feel grateful again", expectTags: ["gratitude_contentment"], expectAnyRef: ["9.22", "12.13", "18.65"] },
  { q: "I want to surrender and have faith", expectTags: ["devotion_surrender"], expectAnyRef: ["18.66", "9.22", "9.34"] },
  { q: "I worry too much about results", expectTags: ["action_without_attachment", "anxiety_fear"], expectAnyRef: ["2.47", "2.48", "3.19"] },
  { q: "Everything feels temporary and I fear death", expectTags: ["impermanence_mortality", "anxiety_fear"], expectAnyRef: ["2.13", "2.20", "2.27"] },
  { q: "I keep falling back into bad habits", expectTags: ["discipline_habit"], expectAnyRef: ["6.5", "6.6", "2.60"] },
  { q: "My ego keeps getting in the way", expectTags: ["ego_pride"], expectAnyRef: ["3.27", "16.4", "18.58"] },
  { q: "I have lost hope that things will get better", expectTags: ["hope"], expectAnyRef: ["18.66", "9.22", "2.40"] },
  { q: "I have no motivation to do anything", expectTags: ["unmotivated"], expectAnyRef: ["3.8", "3.19", "6.5"] },
  { q: "What is my purpose in life?", expectTags: ["purpose_meaning", "duty_responsibility"], expectAnyRef: ["2.47", "3.19", "18.47"] },
  { q: "I feel ashamed and want to hide", expectTags: ["guilt"], expectAnyRef: ["9.30", "18.66", "4.36"] },
];

// ——— Citation gating cases ———
const CITE_CASES = [
  {
    name: "dot refs in range",
    text: "See 2.47 and 18.66 for duty and surrender.",
    expect: ["2.47", "18.66"],
  },
  {
    name: "clock time ignored",
    text: "Meet me at 2:30 tomorrow.",
    expect: [],
  },
  {
    name: "colon with context accepted",
    text: "Krishna says in verse 2:47 to act without attachment.",
    expect: ["2.47"],
  },
  {
    name: "out of range chapter",
    text: "Look at 22.5 carefully.",
    expect: [],
  },
  {
    name: "verse beyond chapter max",
    text: "Chapter 12.55 does not exist.",
    expect: [],
  },
];

function formatRef(s) {
  return `${s.chapter}.${s.verse_number}`;
}

const SEARCH_ALIASES = {
  lonely: ["loneliness", "alone", "isolated"],
  loneliness: ["lonely", "alone"],
  anxious: ["anxiety", "fear", "worried"],
  anxiety: ["anxious", "fear"],
  scared: ["fear", "afraid"],
  angry: ["anger", "rage"],
  sad: ["grief", "sorrow"],
  stressed: ["stress", "overwhelm", "burnout"],
  jealous: ["jealousy", "envy"],
  ashamed: ["shame", "guilt"],
};

function expandTokens(tokens) {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const a of SEARCH_ALIASES[t] || []) out.add(a);
  }
  return Array.from(out);
}

function searchSlokas(query, limit = 10) {
  const q = query.trim().toLowerCase();
  const refMatch = q.match(/^(\d{1,2})\s*[.:]\s*(\d{1,3})$/);
  if (refMatch) {
    const chapter = Number(refMatch[1]);
    const verse = Number(refMatch[2]);
    const exact = slokas.find(
      (s) => s.chapter === chapter && s.verse_number === verse
    );
    return exact ? [exact] : [];
  }
  const tokens = expandTokens(q.split(/\s+/).filter((t) => t.length > 1));
  const N = slokas.length;
  const docFreq = new Map();
  const rows = slokas.map((sloka) => {
    const hay = [
      formatRef(sloka),
      sloka.english_translation,
      sloka.hindi_translation,
      sloka.english_meaning || "",
      sloka.hindi_meaning || "",
      ...(sloka.tags || []).map((t) => t.replace(/_/g, " ")),
    ]
      .join(" ")
      .toLowerCase();
    return { sloka, hay };
  });
  for (const token of tokens) {
    docFreq.set(
      token,
      rows.filter((r) => r.hay.includes(token)).length
    );
  }
  return rows
    .map(({ sloka, hay }) => {
      let score = 0;
      if (hay.includes(q)) score += 18;
      for (const token of tokens) {
        if (!hay.includes(token)) continue;
        const df = docFreq.get(token) || 1;
        const idf = Math.log(1 + N / df);
        score += Math.min(8, idf * 2.2);
        if ((sloka.tags || []).some((t) => t.replace(/_/g, " ").includes(token)))
          score += 3;
      }
      return { sloka, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.sloka);
}

const STOP = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","is","am","are",
  "was","were","be","been","being","have","has","had","do","does","did","will",
  "would","could","should","may","might","must","shall","can","need","i","me",
  "my","we","our","you","your","he","she","it","they","them","their","this",
  "that","what","which","who","how","when","where","why","with","from","into",
  "about","over","after","before","then","all","each","few","more","most",
  "other","some","such","no","nor","not","only","own","same","so","than","too",
  "very","just","also","now","im","ive","dont","cant","feeling","feel","feels",
  "felt","like","really","please","help","gita","verse","teaching","krishna",
]);

const MOOD_KEYWORDS = {
  anxiety_fear: ["anxious","anxiety","afraid","fear","scared","worried","worry","nervous","panic","terrified"],
  grief_loss: ["grief","grieving","loss","lost","death","died","mourn","sad","sorrow","cry","crying"],
  anger: ["angry","anger","rage","furious","mad","irritated","resent","exploding"],
  confusion_decision: ["confused","confusion","decision","decide","unsure","stuck","dilemma","choice","choose"],
  overwhelm_burnout: ["overwhelmed","overwhelm","burnout","burned","exhausted","stressed","stress"],
  loneliness: ["lonely","alone","isolated","isolation","nobody"],
  guilt: ["guilt","guilty","ashamed","shame","regret","mistake"],
  jealousy_comparison: ["jealous","jealousy","envy","compare","comparison","unfair","successful"],
  low_self_worth: ["failure","fail","worthless","inadequate","useless"],
  duty_responsibility: ["duty","responsibility","work","job","obligation","should"],
  purpose_meaning: ["purpose","meaning","direction","pointless","life"],
  attachment_desire: ["desire","want","craving","attached","attachment","obsess","addiction","craving"],
  detachment: ["let go","letting go","detach","release"],
  courage: ["courage","brave","stand up","strength"],
  equanimity: ["calm","peace","balance","steady"],
  control_of_mind: ["mind","thoughts","racing","focus","distract","meditation"],
  success_ambition: ["success","ambition","career","win","achieve","goal"],
  relationships_conflict: ["conflict","fight","argument","relationship","partner","family","fighting"],
  gratitude_contentment: ["grateful","gratitude","thankful","content","happy","joy"],
  devotion_surrender: ["faith","pray","god","surrender","devote"],
  action_without_attachment: ["result","outcome","fruit","expect","results"],
  impermanence_mortality: ["death","dying","change","impermanent","mortal","temporary"],
  discipline_habit: ["habit","discipline","routine","practice","lazy","habits"],
  ego_pride: ["ego","pride","arrogant","humble"],
  hope: ["hope","hopeful","optimistic","better"],
  unmotivated: ["unmotivated","motivation","lazy","apathetic","give up"],
};

const TAG_WEIGHT = {
  devotion_surrender: 1.1, purpose_meaning: 0.7, duty_responsibility: 2.2,
  equanimity: 2.4, control_of_mind: 2.5, action_without_attachment: 2.8,
  anxiety_fear: 3.2, grief_loss: 3.2, anger: 3.2, confusion_decision: 3,
  overwhelm_burnout: 3, loneliness: 3, guilt: 3, jealousy_comparison: 3.5,
  low_self_worth: 3.2, attachment_desire: 2.8, detachment: 2.5, courage: 3,
  success_ambition: 2.8, relationships_conflict: 3, gratitude_contentment: 2.5,
  impermanence_mortality: 2.5, discipline_habit: 3.2, ego_pride: 3, hope: 3,
  unmotivated: 3.2,
};

function tokenize(text) {
  const lower = text.toLowerCase();
  const latin = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const hindi = (text.match(/[\u0900-\u097F]{2,}/g) || []).map((w) =>
    w.toLowerCase()
  );
  return Array.from(new Set(latin.concat(hindi)));
}

function inferredTags(query) {
  const lower = query.toLowerCase();
  const hits = [];
  for (const [tag, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) hits.push(tag);
  }
  return hits;
}

function retrieveSlokas(query, limit = 8) {
  const tokens = tokenize(query);
  const tags = inferredTags(query);
  const tagSet = new Set(tags);
  const tagFreq = new Map();
  for (const s of slokas) {
    for (const t of s.tags || []) tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
  }

  const scored = slokas.map((sloka) => {
    let score = 0;
    const translationHay = [
      sloka.english_translation,
      sloka.hindi_translation,
      sloka.english_meaning || "",
      sloka.hindi_meaning || "",
      ...(sloka.tags || []).map((t) => t.replace(/_/g, " ")),
    ]
      .join(" ")
      .toLowerCase();

    for (const token of tokens) {
      if (translationHay.includes(token)) score += 1.8;
      if ((sloka.tags || []).some((t) => t.replace(/_/g, " ").includes(token)))
        score += 2;
    }
    for (const tag of sloka.tags || []) {
      if (!tagSet.has(tag)) continue;
      const freq = tagFreq.get(tag) || 1;
      const rarity = Math.min(3, 700 / freq);
      const weight = TAG_WEIGHT[tag] ?? 2;
      score += weight * (0.5 + rarity * 0.15);
    }
    const onlyBroad =
      (sloka.tags || []).length > 0 &&
      (sloka.tags || []).every(
        (t) => t === "devotion_surrender" || t === "purpose_meaning"
      );
    if (onlyBroad && tags.length > 0) score *= 0.55;
    return { sloka, score };
  });

  scored.sort((a, b) => b.score - a.score || a.sloka.id - b.sloka.id);
  const top = scored.filter((s) => s.score > 0).slice(0, limit);
  return top.map((s) => s.sloka);
}

const VERSE_COUNTS = {
  1: 47, 2: 72, 3: 43, 4: 42, 5: 29, 6: 47, 7: 30, 8: 28, 9: 34,
  10: 42, 11: 55, 12: 20, 13: 35, 14: 27, 15: 20, 16: 24, 17: 28, 18: 78,
};
const CITE_CONTEXT =
  /(?:verse|śloka|sloka|chapter|gita|गीता|श्लोक|अध्याय|bg\.?|see|from)\b/i;

function extractCitedRefs(text) {
  const matches = Array.from(
    text.matchAll(/\b(\d{1,2})\s*([.:])\s*(\d{1,3})\b/g)
  );
  const refs = [];
  for (const m of matches) {
    const chapter = Number(m[1]);
    const sep = m[2];
    const verse = Number(m[3]);
    if (chapter < 1 || chapter > 18) continue;
    const maxVerse = VERSE_COUNTS[chapter] ?? 78;
    if (verse < 1 || verse > maxVerse) continue;
    const idx = m.index ?? 0;
    const around = text.slice(
      Math.max(0, idx - 28),
      Math.min(text.length, idx + m[0].length + 12)
    );
    if (sep === ":" && !CITE_CONTEXT.test(around)) continue;
    refs.push(`${chapter}.${verse}`);
  }
  return Array.from(new Set(refs));
}

let failed = 0;

console.log("\n== Explore search ==");
for (const c of SEARCH_CASES) {
  const results = searchSlokas(c.q, 15);
  const refs = results.map(formatRef);
  if (c.expectExact) {
    const ok = refs[0] === c.expectExact;
    console.log(ok ? "PASS" : "FAIL", `ref ${c.q}`, refs.slice(0, 3));
    if (!ok) failed++;
    continue;
  }
  const tagHit = results.some((s) =>
    (s.tags || []).some((t) => (c.expectTags || []).includes(t))
  );
  const refHit = (c.expectAnyRef || []).some((r) => refs.includes(r));
  const ok = tagHit || refHit;
  console.log(
    ok ? "PASS" : "FAIL",
    `"${c.q}"`,
    "top:",
    refs.slice(0, 5).join(", ") || "(none)"
  );
  if (!ok) failed++;
}

console.log("\n== Madhav retrieve ==");
for (const c of RETRIEVE_CASES) {
  const results = retrieveSlokas(c.q, 10);
  const refs = results.map(formatRef);
  const tagHit = results.some((s) =>
    (s.tags || []).some((t) => (c.expectTags || []).includes(t))
  );
  const refHit = (c.expectAnyRef || []).some((r) => refs.includes(r));
  const ok = tagHit || refHit;
  console.log(
    ok ? "PASS" : "FAIL",
    `"${c.q.slice(0, 48)}${c.q.length > 48 ? "…" : ""}"`,
    "→",
    refs.slice(0, 5).join(", ") || "(none)",
    tagHit ? "(tag)" : "",
    refHit ? "(ref)" : ""
  );
  if (!ok) failed++;
}

console.log("\n== Citation gating ==");
for (const c of CITE_CASES) {
  const got = extractCitedRefs(c.text);
  const ok =
    got.length === c.expect.length &&
    c.expect.every((r) => got.includes(r));
  console.log(ok ? "PASS" : "FAIL", c.name, got.join(", ") || "(none)");
  if (!ok) failed++;
}

console.log("\n== Tag coverage ==");
const need = [
  "loneliness",
  "jealousy_comparison",
  "hope",
  "overwhelm_burnout",
  "low_self_worth",
];
for (const tag of need) {
  const n = slokas.filter((s) => (s.tags || []).includes(tag)).length;
  const ok = n >= 20;
  console.log(ok ? "PASS" : "FAIL", `tag ${tag} count=${n}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll eval checks passed");
