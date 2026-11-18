import plainWordsData from "@/data/plain-words.json";

type Entry = { en: string; hi: string };

const table = plainWordsData as Record<string, Entry | string>;

export function plainWordsKey(chapter: number, verse: number): string {
  return `${chapter}-${verse}`;
}

/** Short plain paraphrase for a verse, or empty if none curated yet. */
export function plainWordsFor(
  chapter: number,
  verse: number,
  lang: "en" | "hi"
): string {
  const entry = table[plainWordsKey(chapter, verse)];
  if (!entry || typeof entry === "string") return "";
  if (lang === "hi") return entry.hi?.trim() || entry.en?.trim() || "";
  return entry.en?.trim() || entry.hi?.trim() || "";
}

export function hasPlainWords(chapter: number, verse: number): boolean {
  return Boolean(plainWordsFor(chapter, verse, "en"));
}
