import chaptersData from "@/data/chapters.json";

export type ChapterMeta = {
  number: number;
  name: string;
  /** Hindi common title (not transliteration of English). */
  name_hi?: string;
  name_sanskrit: string;
  verses_count: number;
  summary: string;
  summary_hi?: string;
  /** Core teaching / moral outcome of the chapter. */
  moral?: string;
  moral_hi?: string;
};

const chapters = chaptersData as ChapterMeta[];

export function getChapterMetas(): ChapterMeta[] {
  return chapters;
}

export function getChapterMeta(number: number): ChapterMeta | undefined {
  return chapters.find((c) => c.number === number);
}

export function chapterMoral(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi"
): string {
  if (!meta) return "";
  if (lang === "hi") return meta.moral_hi?.trim() || meta.moral?.trim() || "";
  return meta.moral?.trim() || meta.moral_hi?.trim() || "";
}

/** Primary chapter heading for the active UI language. */
export function chapterTitle(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi",
  fallback = ""
): string {
  if (!meta) return fallback;
  if (lang === "hi") {
    return meta.name_sanskrit?.trim() || meta.name_hi?.trim() || meta.name || fallback;
  }
  return meta.name?.trim() || meta.name_sanskrit || fallback;
}

/** Secondary line under the title — never switches to the other language’s prose. */
export function chapterSubtitle(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi"
): string {
  if (!meta) return "";
  if (lang === "hi") {
    return meta.name_hi?.trim() || "";
  }
  return meta.name_sanskrit?.trim() || "";
}

export function chapterSummary(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi"
): string {
  if (!meta) return "";
  if (lang === "hi") {
    return meta.summary_hi?.trim() || meta.summary?.trim() || "";
  }
  return meta.summary?.trim() || meta.summary_hi?.trim() || "";
}
