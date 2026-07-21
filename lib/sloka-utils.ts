import type { Sloka } from "@/lib/types";

export function formatVerseRef(sloka: Sloka): string {
  return `${sloka.chapter}.${sloka.verse_number}`;
}

export type TeachingPassage = {
  verses: Sloka[];
  focus: Sloka;
  label: string;
  /** First verse id — shared story cache key for the whole unit */
  anchorId: number;
  unitId: string;
  mode: "teaching" | "scene";
  titleEn: string;
  titleHi: string;
  themeEn: string;
  themeHi: string;
  sceneEn?: string;
  sceneHi?: string;
};

export const SEARCH_SUGGESTIONS = [
  "duty",
  "fear",
  "anger",
  "peace",
  "grief",
  "शांति",
  "2.47",
] as const;

const NEAREST_VOCAB = [
  "duty", "fear", "anger", "peace", "grief", "anxiety", "lonely", "hope",
  "courage", "attachment", "detachment", "discipline", "ego", "guilt",
  "jealousy", "overwhelm", "burnout", "surrender", "meditation", "karma",
  "devotion", "equanimity", "purpose", "shame", "stress", "worry", "calm",
  "focus", "faith", "शांति", "कर्तव्य", "भय", "क्रोध", "दुःख",
  ...SEARCH_SUGGESTIONS,
] as const;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i;
    for (let j = 0; j < b.length; j++) {
      const cur = row[j + 1];
      const cost = a[i] === b[j] ? 0 : 1;
      row[j + 1] = Math.min(row[j + 1] + 1, row[j] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

export function suggestSearchTerms(query: string, limit = 3): string[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9\u0900-\u097f]/gi, ""))
    .filter((t) => t.length >= 3);

  const out: string[] = [];
  for (const token of tokens) {
    let best: { term: string; dist: number } | null = null;
    for (const term of NEAREST_VOCAB) {
      const t = term.toLowerCase();
      if (t === token) continue;
      const dist = levenshtein(token, t);
      const maxDist = token.length <= 4 ? 1 : token.length <= 7 ? 2 : 3;
      if (dist > 0 && dist <= maxDist) {
        if (!best || dist < best.dist) best = { term: t, dist };
      }
    }
    if (best && !out.includes(best.term)) out.push(best.term);
    if (out.length >= limit) break;
  }
  return out;
}
