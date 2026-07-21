import slokasData from "@/data/slokas.json";
import type { Sloka } from "@/lib/types";

const slokas = slokasData as Sloka[];

/** Canonical Gita order — computed once. */
const orderedSlokas = [...slokas].sort(
  (a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number
);

export function getAllSlokas(): Sloka[] {
  return slokas;
}

export function getSlokaById(id: number): Sloka | undefined {
  return slokas.find((s) => s.id === id);
}

export function getSlokasByChapter(chapter: number): Sloka[] {
  return slokas
    .filter((s) => s.chapter === chapter)
    .sort((a, b) => a.verse_number - b.verse_number);
}

export function getChapters(): number[] {
  const set = new Set(slokas.map((s) => s.chapter));
  return Array.from(set).sort((a, b) => a - b);
}

export function getSlokasByTags(tags: string[]): Sloka[] {
  if (tags.length === 0) return [];
  const tagSet = new Set(tags);
  const freq = new Map<string, number>();
  for (const s of slokas) {
    for (const t of s.tags) freq.set(t, (freq.get(t) || 0) + 1);
  }

  return slokas
    .map((sloka) => {
      let score = 0;
      for (const t of sloka.tags) {
        if (!tagSet.has(t)) continue;
        const f = freq.get(t) || 1;
        // Prefer rarer matching tags so moods aren't flooded by broad themes
        score += 1 + Math.min(2.5, 200 / f);
      }
      return { sloka, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.sloka.chapter - b.sloka.chapter ||
        a.sloka.verse_number - b.sloka.verse_number
    )
    .map(({ sloka }) => sloka);
}

export function formatVerseRef(sloka: Sloka): string {
  return `${sloka.chapter}.${sloka.verse_number}`;
}

export function getSlokaByRef(chapter: number, verse: number): Sloka | undefined {
  return slokas.find((s) => s.chapter === chapter && s.verse_number === verse);
}

export function getAdjacentSlokas(id: number): {
  prev: Sloka | null;
  next: Sloka | null;
} {
  const idx = orderedSlokas.findIndex((s) => s.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? orderedSlokas[idx - 1] : null,
    next: idx < orderedSlokas.length - 1 ? orderedSlokas[idx + 1] : null,
  };
}

export type TeachingPassage = {
  /** Verses in the teaching unit (same chapter, consecutive). */
  verses: Sloka[];
  /** The verse the reader opened. */
  focus: Sloka;
  /** e.g. "2.47–2.50" or "2.47" when alone. */
  label: string;
};

/**
 * Many Gita teachings span a short run of consecutive verses.
 * Prefer ~1 before + focus + ~2 after (up to `size`), clamped to the chapter.
 */
export function getTeachingPassage(
  id: number,
  size = 4
): TeachingPassage | null {
  const focus = getSlokaById(id);
  if (!focus) return null;

  const chapterVerses = getSlokasByChapter(focus.chapter);
  const idx = chapterVerses.findIndex((s) => s.id === id);
  if (idx < 0) return null;

  const window = Math.max(1, Math.min(size, chapterVerses.length));
  // Bias slightly forward (argument often continues after the famous line)
  let start = idx - 1;
  let end = start + window;
  if (start < 0) {
    start = 0;
    end = window;
  }
  if (end > chapterVerses.length) {
    end = chapterVerses.length;
    start = Math.max(0, end - window);
  }

  const verses = chapterVerses.slice(start, end);
  const first = verses[0];
  const last = verses[verses.length - 1];
  const label =
    verses.length === 1
      ? formatVerseRef(first)
      : `${formatVerseRef(first)}–${last.verse_number}`;

  return { verses, focus, label };
}

/** Map colloquial search terms to tag / corpus vocabulary. */
const SEARCH_ALIASES: Record<string, string[]> = {
  lonely: ["loneliness", "alone", "isolated"],
  loneliness: ["lonely", "alone"],
  anxious: ["anxiety", "fear", "worried"],
  anxiety: ["anxious", "fear", "worried"],
  scared: ["fear", "afraid", "anxiety"],
  angry: ["anger", "rage"],
  sad: ["grief", "sorrow", "loss"],
  stressed: ["stress", "overwhelm", "burnout"],
  tired: ["burnout", "exhaust", "overwhelm"],
  peace: ["equanimity", "calm", "शांति"],
  peaceful: ["peace", "equanimity", "calm"],
  purpose: ["meaning", "duty"],
  lazy: ["unmotivated", "discipline"],
  jealous: ["jealousy", "envy", "comparison"],
  ashamed: ["shame", "guilt"],
  worthless: ["failure", "inadequate", "self worth"],
};

function expandSearchTokens(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const a of SEARCH_ALIASES[t] || []) out.add(a);
  }
  return Array.from(out);
}

/** Search English, Hindi, IAST, Sanskrit, tags, and chapter.verse refs. */
export function searchSlokas(query: string, limit = 40): Sloka[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const refMatch = q.match(/^(\d{1,2})\s*[.:]\s*(\d{1,3})$/);
  if (refMatch) {
    const chapter = Number(refMatch[1]);
    const verse = Number(refMatch[2]);
    const exact = getSlokaByRef(chapter, verse);
    return exact ? [exact] : [];
  }

  const tokens = expandSearchTokens(
    q
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9\u0900-\u097f]/gi, ""))
      .filter((t) => t.length > 1)
  );

  // Document frequency for IDF (token → how many verses contain it)
  const docFreq = new Map<string, number>();
  const haystacks = slokas.map((sloka) => {
    const ref = formatVerseRef(sloka).toLowerCase();
    const hay = [
      ref,
      sloka.english_translation,
      sloka.hindi_translation,
      sloka.english_meaning ?? "",
      sloka.hindi_meaning ?? "",
      sloka.transliteration_iast,
      sloka.sanskrit_devanagari,
      ...sloka.tags.map((t) => t.replace(/_/g, " ")),
    ]
      .join(" ")
      .toLowerCase();
    return { sloka, ref, hay };
  });

  for (const token of tokens) {
    let count = 0;
    for (const { hay } of haystacks) {
      if (hay.includes(token)) count += 1;
    }
    docFreq.set(token, count);
  }

  const N = slokas.length;

  return haystacks
    .map(({ sloka, ref, hay }) => {
      let score = 0;

      // Exact / phrase match is strongest
      if (hay.includes(q)) score += 18;

      for (const token of tokens) {
        if (!hay.includes(token)) continue;
        const df = docFreq.get(token) || 1;
        // Rarer tokens weigh more; ultra-common tokens almost vanish
        const idf = Math.log(1 + N / df);
        const weight = Math.min(8, idf * 2.2);
        score += weight;

        // Tag-name hit boost
        if (sloka.tags.some((t) => t.replace(/_/g, " ").includes(token))) {
          score += 3 * Math.min(2, idf);
        }

        if (ref === token || ref.startsWith(`${token}.`)) score += 12;
      }

      // Prefer verses whose translation (not only IAST) carries the query
      const translationHay = [
        sloka.english_translation,
        sloka.hindi_translation,
        sloka.english_meaning ?? "",
        sloka.hindi_meaning ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (tokens.some((t) => translationHay.includes(t))) score += 2;

      return { sloka, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.sloka.chapter - b.sloka.chapter ||
        a.sloka.verse_number - b.sloka.verse_number
    )
    .slice(0, limit)
    .map(({ sloka }) => sloka);
}

/** Theme chips for empty-search recovery. */
export const SEARCH_SUGGESTIONS = [
  "duty",
  "fear",
  "anger",
  "peace",
  "grief",
  "शांति",
  "2.47",
] as const;

/** Vocabulary used for typo / nearest recovery. */
const NEAREST_VOCAB = [
  "duty",
  "fear",
  "anger",
  "peace",
  "grief",
  "anxiety",
  "lonely",
  "hope",
  "courage",
  "attachment",
  "detachment",
  "discipline",
  "ego",
  "guilt",
  "jealousy",
  "overwhelm",
  "burnout",
  "surrender",
  "meditation",
  "karma",
  "devotion",
  "equanimity",
  "purpose",
  "shame",
  "stress",
  "worry",
  "calm",
  "focus",
  "faith",
  "शांति",
  "कर्तव्य",
  "भय",
  "क्रोध",
  "दुःख",
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

/** Suggest corrected query terms for typos (e.g. anxity → anxiety). */
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

/**
 * Soft nearest-neighbor verses when exact search is empty.
 * Uses prefix/substring/edit-distance against tags + translation tokens.
 */
export function suggestNearestSlokas(query: string, limit = 6): Sloka[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const corrected = suggestSearchTerms(q, 2);
  const expanded = corrected.length ? corrected.join(" ") : q;
  const direct = searchSlokas(expanded, limit);
  if (direct.length > 0) return direct;

  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9\u0900-\u097f]/gi, ""))
    .filter((t) => t.length >= 3);

  if (tokens.length === 0) return [];

  const scored = slokas.map((sloka) => {
    let score = 0;
    const tagWords = sloka.tags.map((t) => t.replace(/_/g, " ").toLowerCase());
    const hay = [
      ...tagWords,
      sloka.english_translation.toLowerCase(),
      (sloka.english_meaning ?? "").toLowerCase(),
    ].join(" ");

    for (const token of tokens) {
      if (hay.includes(token)) {
        score += 6;
        continue;
      }
      for (const tw of tagWords) {
        for (const part of tw.split(" ")) {
          if (part.length < 3) continue;
          if (part.startsWith(token) || token.startsWith(part)) {
            score += 4;
            continue;
          }
          const maxDist = token.length <= 4 ? 1 : 2;
          if (levenshtein(token, part) <= maxDist) score += 3;
        }
      }
    }
    return { sloka, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.sloka.chapter - b.sloka.chapter ||
        a.sloka.verse_number - b.sloka.verse_number
    )
    .slice(0, limit)
    .map((r) => r.sloka);
}

