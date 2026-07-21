#!/usr/bin/env node
/**
 * Spot-check / repair english_meaning + hindi_meaning vs vedicscriptures
 * (Sivananda EN commentary, Ramsukhdas HI commentary).
 *
 * Usage:
 *   node scripts/qa-commentary.cjs          # report only
 *   node scripts/qa-commentary.cjs --fix   # write repairs into data/slokas.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "slokas.json");
const FIX = process.argv.includes("--fix");
const SAMPLE_COMPARE = [
  [2, 47],
  [2, 3],
  [18, 66],
  [6, 5],
  [9, 22],
  [1, 1],
  [1, 2],
  [3, 19],
  [12, 13],
  [16, 21],
];

function isPlaceholder(text) {
  const t = (text || "").trim();
  if (!t) return true;
  if (t === "." || t === "…" || t === "...") return true;
  if (/^no commentary\.?$/i.test(t)) return true;
  return false;
}

/** Padārtha / word-gloss dump mistakenly stored as prose commentary. */
function isGlossDump(text) {
  const t = (text || "").trim();
  if (!t || t === ".") return false;
  const hasDev = /[\u0900-\u097F]/.test(t);
  const semis = (t.match(/;/g) || []).length;
  const opens = (t.match(/\(/g) || []).length;
  const closes = (t.match(/\)/g) || []).length;
  if (opens > closes) return true;
  if (/^By Swami Sivananda\.?$/i.test(t)) return true;
  if (hasDev && semis >= 2 && t.length < 250) return true;
  if (
    /^[\u0900-\u097F]/.test(t) &&
    /\b(O |the |an |a |of |in |to |by |eager |arrayed)\b/i.test(t) &&
    semis >= 1 &&
    t.length < 300
  ) {
    return true;
  }
  const tokens = t.split(/;\s*/);
  if (
    tokens.length >= 3 &&
    t.length < 300 &&
    tokens.every((p) => p.length < 70) &&
    (hasDev || /^(the |O |an |a )/i.test(tokens[0]))
  ) {
    return true;
  }
  return false;
}

function isTruncatedCommentary(text) {
  const t = (text || "").trim();
  if (!t) return false;
  if (/\([^)]*$/.test(t)) return true;
  if (/[;:,]\s*$/.test(t)) return true;
  if (
    t.length >= 80 &&
    !/[.!?।॥]$/.test(t) &&
    /\b(to|the|and|of|a|for|in)$/i.test(t)
  ) {
    return true;
  }
  return false;
}

function needsEnglishRepair(text) {
  return (
    isPlaceholder(text) || isGlossDump(text) || isTruncatedCommentary(text)
  );
}

function needsHindiRepair(text) {
  return (
    isPlaceholder(text) ||
    /No commentary/i.test(text || "") ||
    isTruncatedCommentary(text)
  );
}

/** Turn Sivananda padaccheda `word? gloss` lines into readable English. */
function formatWordGloss(ec) {
  const body = (ec || "")
    .replace(/^[\d.]+\s*/, "")
    .replace(/No\s*Commentary\.?/gi, "")
    .trim();
  if (!body.includes("?")) return "";

  const parts = [];
  const re = /([^\s?]+)\?\s*([^?]*?)(?=\s+[^\s?]+\?|$)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const gloss = m[2].replace(/\s+/g, " ").trim();
    if (gloss && /[A-Za-z]/.test(gloss)) parts.push(gloss);
  }
  if (parts.length < 3) return "";
  const sentence = parts.join("; ");
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function cleanEnglishCommentary(ec) {
  if (!ec) return "";
  let t = ec
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const commentaryIdx = t.search(/Commentary\b/i);
  if (commentaryIdx >= 0) {
    t = t.slice(commentaryIdx).replace(/^Commentary\s*/i, "").trim();
  } else if (/No\s*Commentary\.?/i.test(t)) {
    return formatWordGloss(ec);
  }

  t = t
    .replace(/No\s*Commentary\.?/gi, "")
    .replace(/([A-Za-z])\?([A-Za-z])/g, "$1, $2")
    .replace(/\?\s+/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (isPlaceholder(t) || t.length < 40) return formatWordGloss(ec);
  return t;
}

function cleanPrabhupadaEc(ec) {
  if (!ec) return "";
  let t = ec.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (isPlaceholder(t) || t.length < 60) return "";
  return t;
}

function cleanRamsukhdasHc(hc) {
  if (!hc) return "";
  let t = hc
    .replace(/\u00a0/g, " ")
    .replace(/^Hindi Commentary By[^\u0900-\u097F]*/i, "")
    .replace(/^[\d.|।\s]+/u, "")
    .replace(/व्याख्या\s*--?\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/No\s*commentary/i.test(t) && t.length < 40) return "";
  if (isPlaceholder(t) || t.length < 40) return "";
  return t;
}

async function fetchSlok(ch, verse) {
  const url = `https://vedicscriptures.github.io/slok/${ch}/${verse}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const slokas = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const placeholders = slokas.filter(
    (s) => needsEnglishRepair(s.english_meaning) || needsHindiRepair(s.hindi_meaning)
  );

  console.log(`Corpus: ${slokas.length} verses`);
  console.log(
    `Meanings needing repair (placeholder / gloss-dump / truncated): ${placeholders.length}`
  );

  const glossOnly = slokas.filter((s) => isGlossDump(s.english_meaning));
  if (glossOnly.length) {
    console.log(
      `EN gloss dumps: ${glossOnly.length} → ${glossOnly
        .slice(0, 12)
        .map((s) => `${s.chapter}.${s.verse_number}`)
        .join(", ")}${glossOnly.length > 12 ? "…" : ""}`
    );
  }

  console.log("\n== Spot-check vs Sivananda (sample) ==");
  let sampleOk = 0;
  for (const [ch, v] of SAMPLE_COMPARE) {
    const local = slokas.find((s) => s.chapter === ch && s.verse_number === v);
    if (!local) {
      console.log("MISS local", `${ch}.${v}`);
      continue;
    }
    try {
      const remote = await fetchSlok(ch, v);
      const cleaned =
        cleanEnglishCommentary(remote.siva?.ec || "") ||
        cleanPrabhupadaEc(remote.prabhu?.ec || "");
      const localEn = (local.english_meaning || "").trim();
      const localOk = !needsEnglishRepair(localEn) && localEn.length > 20;
      let overlap = false;
      if (cleaned && localOk) {
        const needle = cleaned.slice(0, 48).toLowerCase();
        overlap =
          localEn.toLowerCase().includes(needle.slice(0, 28)) ||
          cleaned.toLowerCase().includes(localEn.slice(0, 28).toLowerCase());
      }
      const status = localOk
        ? overlap || !cleaned
          ? "OK"
          : "DIVERGE"
        : "EMPTY/BAD";
      if (status === "OK" || (status === "DIVERGE" && localOk)) sampleOk++;
      console.log(
        status,
        `${ch}.${v}`,
        `local=${localEn.length}c`,
        cleaned ? `src=${cleaned.length}c` : "src=no-comm"
      );
      await sleep(80);
    } catch (err) {
      console.log("ERR", `${ch}.${v}`, err.message);
    }
  }
  console.log(`Sample usable: ${sampleOk}/${SAMPLE_COMPARE.length}`);

  if (!FIX) {
    console.log(
      "\nRun with --fix to repair placeholder / gloss-dump / truncated meanings from source."
    );
    return;
  }

  console.log("\n== Repairing meanings ==");
  let fixedEn = 0;
  let fixedHi = 0;
  let clearedEn = 0;
  let skipped = 0;

  for (const s of placeholders) {
    try {
      const remote = await fetchSlok(s.chapter, s.verse_number);
      const sivaEc = remote.siva?.ec || "";
      const sivaHasProse =
        /Commentary\b/i.test(sivaEc) &&
        !/No\s*Commentary\.?/i.test(
          (sivaEc.match(/Commentary[\s\S]*/i) || [""])[0]
        );
      let en = sivaHasProse
        ? cleanEnglishCommentary(sivaEc)
        : cleanPrabhupadaEc(remote.prabhu?.ec || "") ||
          cleanEnglishCommentary(sivaEc);
      // Never re-store gloss dumps as prose commentary
      if (en && (isGlossDump(en) || isTruncatedCommentary(en))) {
        en = cleanPrabhupadaEc(remote.prabhu?.ec || "");
      }
      if (en && (isGlossDump(en) || isTruncatedCommentary(en))) {
        en = "";
      }
      const hi = cleanRamsukhdasHc(remote.rams?.hc || "");

      let changed = false;
      if (needsEnglishRepair(s.english_meaning)) {
        if (en && !needsEnglishRepair(en)) {
          s.english_meaning = en;
          fixedEn++;
          changed = true;
        } else if (isGlossDump(s.english_meaning) || isTruncatedCommentary(s.english_meaning)) {
          // Clear bad EN so UI falls back to Hindi commentary
          s.english_meaning = "";
          clearedEn++;
          changed = true;
        }
      }
      if (needsHindiRepair(s.hindi_meaning) && hi) {
        s.hindi_meaning = hi;
        fixedHi++;
        changed = true;
      }
      if (!changed) skipped++;
      process.stdout.write(".");
      await sleep(60);
    } catch (err) {
      console.error(`\nfail ${s.chapter}.${s.verse_number}`, err.message);
      skipped++;
    }
  }

  fs.writeFileSync(DATA, JSON.stringify(slokas, null, 2) + "\n");
  console.log(
    `\nFixed EN=${fixedEn} cleared-bad-EN=${clearedEn} HI=${fixedHi} skipped=${skipped}`
  );
  console.log("Wrote", DATA);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
