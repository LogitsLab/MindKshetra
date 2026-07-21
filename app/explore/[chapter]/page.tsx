import { notFound } from "next/navigation";
import ChapterProgressBridge from "@/components/ChapterProgressBridge";
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
    <ChapterProgressBridge
      chapter={chapter}
      meta={getChapterMeta(chapter)}
      slokas={await getSlokasByChapter(chapter)}
    />
  );
}
