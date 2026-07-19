#!/usr/bin/env node
/**
 * Smoke eval for search ranking + tag coverage.
 * Run: npm run eval
 */
const slokas = require("../data/slokas.json");

const CASES = [
  { q: "fear", expectTags: ["anxiety_fear"], expectAnyRef: ["2.3", "11.33", "18.66"] },
  { q: "anger", expectTags: ["anger"], expectAnyRef: ["2.62", "2.63", "16.21"] },
  { q: "duty", expectTags: ["duty_responsibility"], expectAnyRef: ["2.47", "3.19", "18.47"] },
  { q: "grief", expectTags: ["grief_loss"], expectAnyRef: ["2.11", "2.13", "2.27"] },
  { q: "2.47", expectExact: "2.47" },
];

function formatRef(s) {
  return `${s.chapter}.${s.verse_number}`;
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
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
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

let failed = 0;
for (const c of CASES) {
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
    refs.slice(0, 5).join(", "),
    tagHit ? "(tag)" : "",
    refHit ? "(ref)" : ""
  );
  if (!ok) failed++;
}

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
