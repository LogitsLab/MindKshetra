import { formatVerseRef } from "@/lib/slokas";
import type { Sloka } from "@/lib/types";

const VERSE_COUNTS: Record<number, number> = {
  1: 47,
  2: 72,
  3: 43,
  4: 42,
  5: 29,
  6: 47,
  7: 30,
  8: 28,
  9: 34,
  10: 42,
  11: 55,
  12: 20,
  13: 35,
  14: 27,
  15: 20,
  16: 24,
  17: 28,
  18: 78,
};

/**
 * Context that suggests a Gita citation rather than a time/ratio.
 *
 * The Devanagari terms are deliberately OUTSIDE the `\b` group. JavaScript
 * defines `\b` via `\w` = [A-Za-z0-9_], so there is no word boundary after a
 * Devanagari character — `/श्लोक\b/.test("श्लोक 2:47")` is false. Keeping them
 * inside the original single `\b`-terminated alternation made all three dead
 * code, which silently dropped every colon-form citation in Hindi replies
 * (`"श्लोक 2:47 में"` extracted nothing), so verifyAndFixCitations then treated
 * the verse as uncited and appended a redundant "(See X.)".
 *
 * Latin terms keep `\b` so "seen"/"verses" do not match. Devanagari terms match
 * as substrings, which is safe: they are distinctive enough not to false-positive.
 */
const CITE_CONTEXT =
  /(?:(?:verse|śloka|sloka|chapter|gita|bg\.?|see|from)\b|गीता|श्लोक|अध्याय)/i;

/**
 * Find Gita-style chapter.verse citations with context gating.
 * Bare N:M / N.M numbers without verse-like context are ignored
 * (avoids rewriting times like "2:30" or ratios).
 */
export function extractCitedRefs(text: string): string[] {
  const matches = Array.from(
    text.matchAll(/\b(\d{1,2})\s*([.:])\s*(\d{1,3})\b/g)
  );
  const refs: string[] = [];

  for (const m of matches) {
    const chapter = Number(m[1]);
    const sep = m[2];
    const verse = Number(m[3]);
    if (chapter < 1 || chapter > 18) continue;
    const maxVerse = VERSE_COUNTS[chapter] ?? 78;
    if (verse < 1 || verse > maxVerse) continue;

    const idx = m.index ?? 0;
    const windowStart = Math.max(0, idx - 28);
    const windowEnd = Math.min(text.length, idx + m[0].length + 12);
    const around = text.slice(windowStart, windowEnd);

    // Dot refs like 2.47 are the app's normal form — accept when in-range.
    // Colon refs (2:47) need nearby citation context to avoid clock times.
    const hasContext = CITE_CONTEXT.test(around);
    if (sep === ":" && !hasContext) continue;

    refs.push(`${chapter}.${verse}`);
  }

  return Array.from(new Set(refs));
}

/**
 * Ensure Madhav only cites retrieved verses.
 * Invented refs are stripped (not remapped); if nothing valid remains,
 * append a grounding note.
 */
export function verifyAndFixCitations(
  text: string,
  retrieved: Sloka[]
): string {
  if (!text.trim() || retrieved.length === 0) return text;

  const allowed = new Set(retrieved.map((s) => formatVerseRef(s)));
  const primary = formatVerseRef(retrieved[0]);
  const cited = extractCitedRefs(text);
  const invented = cited.filter((ref) => !allowed.has(ref));

  let out = text;
  for (const bad of invented) {
    const [c, v] = bad.split(".");
    const pattern = new RegExp(`\\b${c}\\s*[.:]\\s*${v}\\b`, "g");
    out = out.replace(pattern, "").replace(/[ \t]{2,}/g, " ");
  }

  out = out
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,;.])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const after = extractCitedRefs(out);
  const hasAllowed = after.some((ref) => allowed.has(ref));
  const mentionsInWords = retrieved.some((s) => {
    const ref = formatVerseRef(s);
    return (
      out.includes(ref) ||
      new RegExp(
        `chapter\\s+${s.chapter}[^\\d]{0,12}verse\\s+${s.verse_number}`,
        "i"
      ).test(out) ||
      new RegExp(`श्लोक\\s*${s.chapter}\\s*[.:]?\\s*${s.verse_number}`).test(out)
    );
  });

  if (!hasAllowed && !mentionsInWords) {
    out = `${out} (See ${primary}.)`;
  }

  return out;
}
