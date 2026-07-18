import { formatVerseRef } from "@/lib/slokas";
import type { Sloka } from "@/lib/types";

/** Find chapter.verse style citations in model text. */
export function extractCitedRefs(text: string): string[] {
  const matches = text.match(/\b(\d{1,2})\s*[.:]\s*(\d{1,3})\b/g) || [];
  return Array.from(
    new Set(
      matches.map((m) => {
        const parts = m.match(/(\d{1,2})\s*[.:]\s*(\d{1,3})/);
        if (!parts) return "";
        return `${Number(parts[1])}.${Number(parts[2])}`;
      }).filter(Boolean)
    )
  );
}

/**
 * Ensure Madhav only cites retrieved verses. Rewrites invented refs to the
 * top retrieved verse when needed, and appends a grounding note if none cited.
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
    out = out.replace(pattern, primary);
  }

  const after = extractCitedRefs(out);
  const hasAllowed = after.some((ref) => allowed.has(ref));
  if (!hasAllowed) {
    out = `${out.trim()} (See ${primary}.)`;
  }

  return out;
}
