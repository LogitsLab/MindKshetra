/**
 * Assert every verse maps to exactly one PASSAGE_UNITS entry (coverage regression).
 * Run: node scripts/assert-passage-coverage.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const slokas = JSON.parse(
  fs.readFileSync(path.join(root, "data/slokas.json"), "utf8")
);

// Parse PASSAGE_UNITS from TypeScript source (simple range extraction).
const passagesSrc = fs.readFileSync(
  path.join(root, "lib/passages.ts"),
  "utf8"
);
const unitRe =
  /chapter:\s*(\d+)\s*,\s*from:\s*(\d+)\s*,\s*to:\s*(\d+)/g;
const units = [];
let m;
while ((m = unitRe.exec(passagesSrc)) !== null) {
  units.push({
    chapter: Number(m[1]),
    from: Number(m[2]),
    to: Number(m[3]),
  });
}

if (!units.length) {
  console.error("No PASSAGE_UNITS ranges found in lib/passages.ts");
  process.exit(1);
}

const gaps = [];
const overlaps = [];

for (const sloka of slokas) {
  const matches = units.filter(
    (u) =>
      u.chapter === sloka.chapter &&
      sloka.verse_number >= u.from &&
      sloka.verse_number <= u.to
  );
  if (matches.length === 0) {
    gaps.push(`${sloka.chapter}.${sloka.verse_number}`);
  } else if (matches.length > 1) {
    overlaps.push(`${sloka.chapter}.${sloka.verse_number}`);
  }
}

if (gaps.length || overlaps.length) {
  if (gaps.length) {
    console.error(`Uncovered verses (${gaps.length}):`, gaps.slice(0, 40).join(", "));
  }
  if (overlaps.length) {
    console.error(
      `Overlapping verses (${overlaps.length}):`,
      overlaps.slice(0, 40).join(", ")
    );
  }
  process.exit(1);
}

console.log(
  `OK: ${slokas.length} verses each map to exactly one of ${units.length} passage units.`
);
