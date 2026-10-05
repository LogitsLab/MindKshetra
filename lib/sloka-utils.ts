import type { Mood, Sloka } from "@/lib/types";

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

/**
 * A verse trimmed for list pages (chapter, mood): the card shows two clamped
 * lines of commentary, but full rows shipped every commentary and word gloss
 * twice — once as HTML, once in the hydration payload. /explore/2 was 564 KB,
 * and the same commentary paragraph appeared on three URLs.
 */
export const CARD_COMMENTARY_MAX_CHARS = 220;

export function toCardSloka(sloka: Sloka): Sloka {
  return {
    ...sloka,
    english_meaning: sloka.english_meaning
      ? truncatePreview(sloka.english_meaning, CARD_COMMENTARY_MAX_CHARS)
      : undefined,
    hindi_meaning: sloka.hindi_meaning
      ? truncatePreview(sloka.hindi_meaning, CARD_COMMENTARY_MAX_CHARS)
      : undefined,
    word_meanings: undefined,
  };
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
 * Deterministic per-(page, candidate) hash: a stable, well-spread tie-break so
 * equally related verses rotate across pages instead of always resolving to
 * the earliest chapter.
 */
function tieSpread(currentId: number, candidateId: number): number {
  let h = Math.imul(currentId, 0x9e3779b1) ^ Math.imul(candidateId, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Rank candidate verses by how many tags they share with `current`.
 *
 * - the current verse itself is excluded
 * - zero-overlap candidates are dropped
 * - equal overlap breaks by tag rarity (sharing a rare tag says more than
 *   sharing a common one), then by a deterministic per-page spread
 * - at most one verse per chapter until every chapter is used, then the
 *   remaining slots fill in rank order
 *
 * Ties used to break by chapter, then verse number. With only 26 tags most
 * candidates tie, so every page linked the same early verses: 2.2 received 65
 * related links, 36% of all links pointed at chapters 1–2, and 245 verses
 * received none. Prerendered into all 701 pages, so it must stay pure and
 * deterministic.
 *
 * Candidates typically come from `getSlokasByTags(current.tags)`, which
 * returns every verse sharing at least one tag — so tag frequency within the
 * pool equals corpus frequency for the tags that matter here.
 */
export function rankRelatedSlokas(
  current: Sloka,
  candidates: Sloka[],
  limit = 4
): Sloka[] {
  const currentTags = new Set(current.tags);
  const seen = new Set<number>();
  const pool = candidates.filter((s) => {
    if (s.id === current.id || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const frequency = new Map<string, number>();
  for (const s of pool) {
    for (const t of Array.from(new Set(s.tags))) {
      if (currentTags.has(t)) frequency.set(t, (frequency.get(t) ?? 0) + 1);
    }
  }

  const ranked = pool
    .map((sloka) => {
      const shared = Array.from(new Set(sloka.tags)).filter((t) =>
        currentTags.has(t)
      );
      const rarity = shared.reduce(
        (sum, t) => sum + 1 / (frequency.get(t) ?? 1),
        0
      );
      return {
        sloka,
        overlap: shared.length,
        rarity: Math.round(rarity * 1e6),
        spread: tieSpread(current.id, sloka.id),
      };
    })
    .filter(({ overlap }) => overlap > 0)
    .sort(
      (a, b) =>
        b.overlap - a.overlap || b.rarity - a.rarity || a.spread - b.spread
    )
    .map(({ sloka }) => sloka);

  const picked: Sloka[] = [];
  const chaptersUsed = new Set<number>();
  for (const sloka of ranked) {
    if (picked.length >= limit) break;
    if (chaptersUsed.has(sloka.chapter)) continue;
    chaptersUsed.add(sloka.chapter);
    picked.push(sloka);
  }
  for (const sloka of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(sloka)) picked.push(sloka);
  }
  return picked;
}

export type MoodLink = { id: string; label: string; labelHi: string };

/**
 * Mood pages whose tags this verse carries, strongest overlap first. Verse
 * pages linked their themes only to `/explore?q=` search URLs, so the mood
 * pages — the landing pages people search for — got no links from the 701
 * verses that feed them.
 */
export function relatedMoods(
  sloka: Sloka,
  moods: Mood[],
  limit = 3
): MoodLink[] {
  const tags = new Set(sloka.tags);
  return moods
    .map((mood, order) => ({
      mood,
      order,
      overlap: mood.tags.filter((t) => tags.has(t)).length,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.order - b.order)
    .slice(0, limit)
    .map(({ mood }) => ({ id: mood.id, label: mood.label, labelHi: mood.labelHi }));
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
