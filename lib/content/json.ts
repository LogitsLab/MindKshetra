import slokasData from "@/data/slokas.json";
import { moods as moodList } from "@/lib/moods-data";
import type { Mood, Sloka } from "@/lib/types";

const slokas = slokasData as Sloka[];

const orderedSlokas = [...slokas].sort(
  (a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number
);

const slokasById = new Map<number, Sloka>(slokas.map((s) => [s.id, s]));

export function jsonGetAllSlokas(): Sloka[] {
  return slokas;
}

export function jsonGetSlokaById(id: number): Sloka | undefined {
  return slokasById.get(id);
}

/** Bulk lookup preserving input order; unknown ids are skipped. */
export function jsonGetSlokasByIds(ids: number[]): Sloka[] {
  const out: Sloka[] = [];
  for (const id of ids) {
    const sloka = slokasById.get(id);
    if (sloka) out.push(sloka);
  }
  return out;
}

export function jsonGetSlokasByChapter(chapter: number): Sloka[] {
  return slokas
    .filter((s) => s.chapter === chapter)
    .sort((a, b) => a.verse_number - b.verse_number);
}

export function jsonGetChapters(): number[] {
  const set = new Set(slokas.map((s) => s.chapter));
  return Array.from(set).sort((a, b) => a - b);
}

export function jsonGetSlokaByRef(
  chapter: number,
  verse: number
): Sloka | undefined {
  return slokas.find((s) => s.chapter === chapter && s.verse_number === verse);
}

export function jsonGetAdjacentSlokas(id: number): {
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

// Corpus-wide tag frequencies are immutable per process; computing them on
// every mood lookup re-walked all 701 verses' tags each time.
let tagFrequency: Map<string, number> | null = null;

function getTagFrequency(): Map<string, number> {
  if (!tagFrequency) {
    tagFrequency = new Map<string, number>();
    for (const s of slokas) {
      for (const t of s.tags) {
        tagFrequency.set(t, (tagFrequency.get(t) || 0) + 1);
      }
    }
  }
  return tagFrequency;
}

export function jsonGetSlokasByTags(tags: string[]): Sloka[] {
  if (tags.length === 0) return [];
  const tagSet = new Set(tags);
  const freq = getTagFrequency();
  return slokas
    .map((sloka) => {
      let score = 0;
      for (const t of sloka.tags) {
        if (!tagSet.has(t)) continue;
        const f = freq.get(t) || 1;
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

export function jsonGetAllMoods(): Mood[] {
  return moodList;
}

export function jsonGetMoodById(id: string): Mood | undefined {
  return moodList.find((m) => m.id === id);
}
