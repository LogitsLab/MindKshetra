import { describe, it, expect } from "vitest";
import slokas from "@/data/slokas.json";
import commentarySources from "@/data/commentary-sources.json";

/**
 * Verse text is rendered on 701 public pages and fed into meta descriptions,
 * structured data and the retrieval index, so a data regression ships
 * silently. These assertions guard the repairs made against the
 * vedicscriptures.github.io source text:
 *
 * - The OCR of the source dropped every "qu" ("alities" for qualities,
 *   "ite" for quite, "eal" for equal). The tokens below were reviewed by hand
 *   and must never reappear as whole words.
 * - Ramsukhdas' Hindi carries page-footnote markers ("(टिप्पणी प0 1.2)")
 *   that mean nothing outside the printed book.
 * - data/commentary-sources.json drives the public credit lines, so every key
 *   must point at a real verse and every source id must be one the UI knows.
 */

type Verse = {
  chapter: number;
  verse_number: number;
  english_meaning?: string | null;
  english_translation?: string | null;
  hindi_meaning?: string | null;
  hindi_translation?: string | null;
};

const VERSES = slokas as Verse[];

/** Reviewed OCR damage tokens (all lowercase; matched case-insensitively). */
const OCR_DAMAGE_TOKENS = [
  "alities", "ite", "eal", "eilibrium", "eally", "acired", "acisition",
  "conseently", "relinish", "conered", "acire", "eipped", "tranillity",
  "reired", "coners", "tranil", "liors", "technie", "conseence",
  "conseences", "coneror", "acires", "aciring", "ery", "estioning", "reest",
  "conseent", "antity", "earthake", "acisitions", "alityless", "enches",
  "eals", "eipments", "antities", "lior", "acainted", "relinished",
  "relinishing", "conest", "eivalent", "eivalen", "alifiaction", "liour",
];

// Word boundary that also treats IAST letters (ṛ, ṣ, ā…) as part of a word,
// so "prakṛite" in a transliteration is not mistaken for "ite".
const OCR_DAMAGE_RE = new RegExp(
  `(?<![\\p{L}\\p{M}])(?:${OCR_DAMAGE_TOKENS.join("|")})(?![\\p{L}\\p{M}])`,
  "iu"
);

const FOOTNOTE_RE = /टिप्पणी\s*प0/;

const ALLOWED_SOURCES = new Set([
  "sivananda",
  "prabhupada",
  "chinmayananda",
  "ramsukhdas",
  "tejomayananda",
  "unknown",
]);

const SOURCE_FIELDS = [
  "english_meaning",
  "hindi_meaning",
  "hindi_translation",
  "english_translation",
] as const;

const ref = (v: Verse) => `${v.chapter}.${v.verse_number}`;

describe("verse data quality", () => {
  it("has the full corpus", () => {
    expect(VERSES.length).toBe(701);
  });

  it("has no dropped-'qu' OCR tokens left in English text", () => {
    const hits: string[] = [];
    for (const v of VERSES) {
      for (const field of ["english_meaning", "english_translation"] as const) {
        const m = (v[field] ?? "").match(OCR_DAMAGE_RE);
        if (m) hits.push(`${ref(v)} ${field}: "${m[0]}"`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("keeps legitimate words the OCR tokens are substrings of", () => {
    // Guards against a future "fix" that drops the whole-word boundary.
    expect(OCR_DAMAGE_RE.test("white kite equal quite united")).toBe(false);
    expect(OCR_DAMAGE_RE.test("prakṛite")).toBe(false);
    expect(OCR_DAMAGE_RE.test("noble alities.")).toBe(true);
    expect(OCR_DAMAGE_RE.test("Eilibrium is Yoga")).toBe(true);
  });

  it("has no printed-book footnote markers in Hindi text", () => {
    const hits = VERSES.filter((v) =>
      FOOTNOTE_RE.test(`${v.hindi_translation ?? ""} ${v.hindi_meaning ?? ""}`)
    ).map(ref);
    expect(hits).toEqual([]);
  });

  it("has no doubled e-matra typos in Hindi text", () => {
    const hits = VERSES.filter((v) =>
      /ेे/.test(`${v.hindi_translation ?? ""} ${v.hindi_meaning ?? ""}`)
    ).map(ref);
    expect(hits).toEqual([]);
  });
});

describe("commentary-sources.json", () => {
  const { defaults, overrides } = commentarySources as {
    defaults: Record<string, string | null>;
    overrides: Record<string, Record<string, string>>;
  };
  const verseRefs = new Set(VERSES.map(ref));

  it("sets a default for every credited field", () => {
    for (const field of SOURCE_FIELDS) {
      expect(defaults).toHaveProperty(field);
      const id = defaults[field];
      if (id !== null) expect(ALLOWED_SOURCES.has(id)).toBe(true);
    }
  });

  it("only overrides verses that exist", () => {
    const missing = Object.keys(overrides).filter((k) => !verseRefs.has(k));
    expect(missing).toEqual([]);
  });

  it("only uses known fields and source ids", () => {
    const bad: string[] = [];
    for (const [key, fields] of Object.entries(overrides)) {
      for (const [field, id] of Object.entries(fields)) {
        if (!(SOURCE_FIELDS as readonly string[]).includes(field)) {
          bad.push(`${key}: unknown field ${field}`);
        }
        if (!ALLOWED_SOURCES.has(id)) bad.push(`${key}.${field}: ${id}`);
        if (id === defaults[field]) bad.push(`${key}.${field}: repeats default`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("credits Prabhupada for the purport at 18.66, not Sivananda", () => {
    expect(overrides["18.66"]?.english_meaning).toBe("prabhupada");
    const v = VERSES.find((s) => ref(s) === "18.66");
    expect(v?.english_meaning).toMatch(/^The Lord has described various kinds/);
  });
});
