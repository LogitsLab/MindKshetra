import { notFound } from "next/navigation";
import ChapterPageClient from "@/components/ChapterPageClient";
import { getChapterMeta } from "@/lib/chapters";
import { getChapters, getSlokasByChapter } from "@/lib/slokas";

type Props = { params: { chapter: string } };

export default function ChapterPage({ params }: Props) {
  const chapter = Number(params.chapter);
  if (!Number.isInteger(chapter) || !getChapters().includes(chapter)) {
    notFound();
  }

  return (
    <ChapterPageClient
      chapter={chapter}
      meta={getChapterMeta(chapter)}
      slokas={getSlokasByChapter(chapter)}
    />
  );
}
