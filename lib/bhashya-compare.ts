import compareData from "@/data/bhashya-compare.json";

export type BhashyaCompareVoice = {
  id: string;
  label: string;
  text: string;
};

type Entry = {
  en?: BhashyaCompareVoice[];
  hi?: BhashyaCompareVoice[];
};

const table = compareData as Record<string, Entry | string>;

export function bhashyaCompareKey(chapter: number, verse: number): string {
  return `${chapter}.${verse}`;
}

/** Curated dual-voice emphasis for flagship verses, or null. */
export function bhashyaCompareFor(
  chapter: number,
  verse: number,
  lang: "en" | "hi"
): BhashyaCompareVoice[] | null {
  const entry = table[bhashyaCompareKey(chapter, verse)];
  if (!entry || typeof entry === "string") return null;
  const voices = entry[lang] ?? entry.en;
  if (!voices || voices.length < 2) return null;
  return voices;
}

export function hasBhashyaCompare(chapter: number, verse: number): boolean {
  return Boolean(
    bhashyaCompareFor(chapter, verse, "en") ||
      bhashyaCompareFor(chapter, verse, "hi")
  );
}
