import chaptersData from "@/data/chapters.json";

export type ChapterMeta = {
  number: number;
  name: string;
  name_sanskrit: string;
  verses_count: number;
  summary: string;
};

const chapters = chaptersData as ChapterMeta[];

export function getChapterMetas(): ChapterMeta[] {
  return chapters;
}

export function getChapterMeta(number: number): ChapterMeta | undefined {
  return chapters.find((c) => c.number === number);
}
