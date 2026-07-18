import slokasData from "@/data/slokas.json";
import type { Sloka } from "@/lib/types";

const slokas = slokasData as Sloka[];

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
  const ordered = [...slokas].sort(
    (a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number
  );
  const idx = ordered.findIndex((s) => s.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? ordered[idx - 1] : null,
    next: idx < ordered.length - 1 ? ordered[idx + 1] : null,
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

/** Search English, Hindi, IAST, Sanskrit, and chapter.verse refs. */
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

  const tokens = q.split(/\s+/).filter((t) => t.length > 1);

  return slokas
    .map((sloka) => {
      const ref = formatVerseRef(sloka).toLowerCase();
      const haystack = [
        ref,
        sloka.english_translation,
        sloka.hindi_translation,
        sloka.english_meaning ?? "",
        sloka.hindi_meaning ?? "",
        sloka.transliteration_iast,
        sloka.sanskrit_devanagari,
        ...sloka.tags,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      if (haystack.includes(q)) score += 10;
      for (const token of tokens) {
        if (haystack.includes(token)) score += 2;
        if (ref === token || ref.startsWith(`${token}.`)) score += 5;
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
    .slice(0, limit)
    .map(({ sloka }) => sloka);
}
