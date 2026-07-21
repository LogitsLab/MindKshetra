import { notFound } from "next/navigation";
import ChapterPageClient from "@/components/ChapterPageClient";
import { getChapterMeta } from "@/lib/chapters";
import { getChapters, getSlokasByChapter } from "@/lib/slokas";

type Props = { params: { chapter: string } };

export default async function ChapterPage({ params }: Props) {
  const chapter = Number(params.chapter);
  const chapters = await getChapters();
  if (!Number.isInteger(chapter) || !chapters.includes(chapter)) {
    notFound();
  }

  return (
    <ChapterPageClient
      chapter={chapter}
      meta={getChapterMeta(chapter)}
      slokas={await getSlokasByChapter(chapter)}
    />
  );
}
