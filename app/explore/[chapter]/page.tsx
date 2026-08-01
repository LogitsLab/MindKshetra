import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterProgressBridge from "@/components/ChapterProgressBridge";
import { getChapterMeta } from "@/lib/chapters";
import { metaDescription } from "@/lib/sloka-utils";
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

/**
 * All 18 chapter pages inherited the site-wide title and blurb, so search
 * results listed eighteen identical entries and a share of Chapter 2 was
 * indistinguishable from a share of the home page.
 *
 * No per-chapter OG route exists (only `/api/og/verse/[id]`), so these keep the
 * site card — but the title and description are the chapter's own.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = getChapterMeta(Number(params.chapter));
  if (!meta) return {};

  const title = `Chapter ${meta.number}: ${meta.name} · Bhagavad Gita`;
  const description = metaDescription(
    meta.summary ||
      `${meta.name_sanskrit} — ${meta.verses_count} verses of the Bhagavad Gita, with translation and commentary.`
  );
  const url = `/explore/${meta.number}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [
        { url: "/images/og.jpg", width: 1200, height: 630, alt: "MindKshetra" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/og.jpg"],
    },
  };
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
