import { notFound } from "next/navigation";
import ChapterProgressBridge from "@/components/ChapterProgressBridge";
import { getChapterMeta } from "@/lib/chapters";
import { getChapters, getSlokasByChapter } from "@/lib/slokas";

type Props = { params: { chapter: string } };

// Chapter content is immutable; pre-render all 18 for instant navigation.
// force-static: see app/sloka/[id]/page.tsx — no-store DB fetches otherwise
// demote the prerender silently.
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const chapters = await getChapters();
  return chapters.map((chapter) => ({ chapter: String(chapter) }));
}

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
