import chaptersData from "@/data/chapters.json";

export type ChapterMeta = {
  number: number;
  name: string;
  name_sanskrit: string;
  verses_count: number;
  summary: string;
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
