import type { Sloka } from "@/lib/types";

export function formatVerseRef(sloka: Sloka): string {
  return `${sloka.chapter}.${sloka.verse_number}`;
}

/**
 * Trim prose to a meta-description length, cutting at a word boundary.
 *
 * Search engines truncate around 155–160 characters anyway; doing it here means
 * the cut lands between words with an ellipsis rather than mid-word with a hard
 * stop, and the same rule applies to verses, chapters and moods.
 */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
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

/**
 * Slim payload for the "Related verses" interlinks on the verse page.
 * Full Sloka rows carry commentary + word glosses; embedding four of them in
 * every prerendered page's RSC payload would bloat the HTML for no reason.
 */
export type RelatedVersePreview = {
  id: number;
  chapter: number;
  verse_number: number;
  previewEn: string;
  previewHi: string;
};

export const PREVIEW_MAX_CHARS = 90;

/**
 * First ~`max` chars of a translation, cut on a word boundary with an
 * ellipsis. Cutting at whitespace also keeps Devanagari clusters intact — a
 * hard mid-word cut could orphan a matra from its base consonant.
 */
export function truncatePreview(text: string, max = PREVIEW_MAX_CHARS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const window = clean.slice(0, max + 1);
  const lastSpace = window.lastIndexOf(" ");
  // A pathological unbroken run falls back to a hard cut rather than
  // returning a uselessly short preview.
  const cut =
    lastSpace > Math.floor(max * 0.6)
      ? window.slice(0, lastSpace)
      : clean.slice(0, max);
  return `${cut.trimEnd()}…`;
}

export function toRelatedVersePreview(sloka: Sloka): RelatedVersePreview {
  return {
    id: sloka.id,
    chapter: sloka.chapter,
    verse_number: sloka.verse_number,
    previewEn: truncatePreview(sloka.english_translation),
    previewHi: truncatePreview(sloka.hindi_translation),
  };
}

/**
 * Rank candidate verses by how many tags they share with `current`.
 *
 * - the current verse itself is excluded
 * - zero-overlap candidates are dropped
 * - ties break deterministically by chapter, then verse number
 *
 * Candidates typically come from `getSlokasByTags(current.tags)`, which
 * returns every verse sharing at least one tag; this reduces that pool to the
 * strongest few. Pure and isomorphic so it can be unit-tested directly.
 */
export function rankRelatedSlokas(
  current: Sloka,
  candidates: Sloka[],
  limit = 4
): Sloka[] {
  const currentTags = new Set(current.tags);
  const seen = new Set<number>();

  return candidates
    .filter((s) => {
      if (s.id === current.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .map((sloka) => ({
      sloka,
      overlap: new Set(sloka.tags.filter((t) => currentTags.has(t))).size,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        a.sloka.chapter - b.sloka.chapter ||
        a.sloka.verse_number - b.sloka.verse_number
    )
    .slice(0, limit)
    .map(({ sloka }) => sloka);
}

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
