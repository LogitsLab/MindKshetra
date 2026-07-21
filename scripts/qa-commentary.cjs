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
    .replace(/^[\d.]+\s*/u, "")
    .replace(/व्याख्या--\s*/u, "")
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
    (s) =>
      isPlaceholder(s.english_meaning) ||
      isPlaceholder(s.hindi_meaning) ||
      /No commentary/i.test(s.hindi_meaning || "")
  );

  console.log(`Corpus: ${slokas.length} verses`);
  console.log(`Placeholder / missing meanings: ${placeholders.length}`);

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
      const localOk = !isPlaceholder(localEn) && localEn.length > 20;
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
        : "EMPTY";
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
    console.log("\nRun with --fix to fill placeholder meanings from source.");
    return;
  }

  console.log("\n== Repairing placeholders ==");
  let fixedEn = 0;
  let fixedHi = 0;
  let skipped = 0;

  for (const s of placeholders) {
    try {
      const remote = await fetchSlok(s.chapter, s.verse_number);
      const sivaEc = remote.siva?.ec || "";
      const sivaHasProse = /Commentary\b/i.test(sivaEc) && !/No\s*Commentary\.?/i.test(
        (sivaEc.match(/Commentary[\s\S]*/i) || [""])[0]
      );
      const en = sivaHasProse
        ? cleanEnglishCommentary(sivaEc)
        : cleanPrabhupadaEc(remote.prabhu?.ec || "") ||
          cleanEnglishCommentary(sivaEc);
      const hi = cleanRamsukhdasHc(remote.rams?.hc || "");

      let changed = false;
      if (isPlaceholder(s.english_meaning) && en) {
        s.english_meaning = en;
        fixedEn++;
        changed = true;
      }
      if (
        (isPlaceholder(s.hindi_meaning) ||
          /No commentary/i.test(s.hindi_meaning || "")) &&
        hi
      ) {
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
  console.log(`\nFixed EN=${fixedEn} HI=${fixedHi} skipped=${skipped}`);
  console.log("Wrote", DATA);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
