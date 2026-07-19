import { formatVerseRef } from "@/lib/slokas";
import type { Sloka } from "@/lib/types";

/**
 * Find Gita-style chapter.verse citations.
 * Restricts to chapters 1–18 and verse numbers ≤78 to avoid clock times (e.g. 2:30).
 */
export function extractCitedRefs(text: string): string[] {
  const matches = Array.from(
    text.matchAll(/\b(\d{1,2})\s*[.:]\s*(\d{1,3})\b/g)
  );
  const refs: string[] = [];
  for (const m of matches) {
    const chapter = Number(m[1]);
    const verse = Number(m[2]);
    if (chapter < 1 || chapter > 18) continue;
    if (verse < 1 || verse > 78) continue;
    refs.push(`${chapter}.${verse}`);
  }
  return Array.from(new Set(refs));
}

/**
 * Ensure Madhav only cites retrieved verses.
 * Invented refs are stripped (not remapped) to avoid corrupting prose;
 * if nothing valid remains, append a grounding note.
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

  // Collapse awkward leftover punctuation from stripped refs
  out = out
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,;.])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const after = extractCitedRefs(out);
  const hasAllowed = after.some((ref) => allowed.has(ref));
  const mentionsInWords =
    /chapter\s+\d+|श्लोक\s*\d+|verse\s+\d+/i.test(out) &&
    retrieved.some((s) =>
      out.includes(`${s.chapter}.${s.verse_number}`) ||
      out.includes(`chapter ${s.chapter}`)
    );

  if (!hasAllowed && !mentionsInWords) {
    out = `${out} (See ${primary}.)`;
  }

  return out;
}
