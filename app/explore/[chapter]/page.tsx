import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterProgressBridge from "@/components/ChapterProgressBridge";
import JsonLd from "@/components/JsonLd";
import { chapterRomanizedName, getChapterMeta } from "@/lib/chapters";
import {
  breadcrumbNode,
  chapterSeoDescription,
  chapterSeoTitle,
  gitaBookNode,
  pageMetadata,
  publisherRef,
  SCHEMA_IDS,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { formatVerseRef, toCardSloka } from "@/lib/sloka-utils";
import { getChapters, getSlokasByChapter } from "@/lib/slokas";

type Props = { params: { chapter: string } };

// Chapter content is immutable; pre-render all 18 for instant navigation.
// force-static: see app/sloka/[id]/page.tsx — no-store DB fetches otherwise
// demote the prerender silently.
export const dynamic = "force-static";
export const revalidate = 86400;
// Every valid id is prerendered above; anything else is a real 404 from the
// router (it used to render on demand as a cached 200 + noindex soft 404).
export const dynamicParams = false;

export async function generateStaticParams() {
  const chapters = await getChapters();
  return chapters.map((chapter) => ({ chapter: String(chapter) }));
}

/**
 * Titles lead with "Bhagavad Gita Chapter N" and the romanised Sanskrit name
 * searchers use ("Sankhya Yoga"); the English name ("Transcendental
 * Knowledge") reached 93 characters on some chapters and nobody searches it.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = getChapterMeta(Number(params.chapter));
  if (!meta) notFound();

  return pageMetadata({
    title: chapterSeoTitle(meta.number, chapterRomanizedName(meta)),
    description: chapterSeoDescription({
      chapter: meta.number,
      romanizedName: chapterRomanizedName(meta),
      name: meta.name,
      versesCount: meta.verses_count,
      moral: meta.moral,
    }),
    path: `/explore/${meta.number}`,
    type: "article",
  });
}

export default async function ChapterPage({ params }: Props) {
  const chapter = Number(params.chapter);
  const chapters = await getChapters();
  if (!Number.isInteger(chapter) || !chapters.includes(chapter)) {
    notFound();
  }

  const meta = getChapterMeta(chapter);
  const slokas = await getSlokasByChapter(chapter);
  const path = `/explore/${chapter}`;
  const pageUrl = absoluteUrl(path);
  const chapterName = meta
    ? `Chapter ${chapter}: ${chapterRomanizedName(meta)}`
    : `Chapter ${chapter}`;

  return (
    <>
      <JsonLd
        graph={[
          {
            "@type": "CollectionPage",
            "@id": `${pageUrl}#webpage`,
            url: pageUrl,
            name: meta
              ? chapterSeoTitle(chapter, chapterRomanizedName(meta))
              : chapterName,
            inLanguage: "en",
            isPartOf: { "@id": SCHEMA_IDS.website() },
            breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
            mainEntity: { "@id": `${pageUrl}#chapter` },
            publisher: publisherRef(),
          },
          {
            "@type": "Chapter",
            "@id": `${pageUrl}#chapter`,
            name: chapterName,
            ...(meta ? { alternateName: [meta.name, meta.name_sanskrit] } : {}),
            position: chapter,
            url: pageUrl,
            ...(meta?.summary ? { abstract: meta.summary } : {}),
            isPartOf: { "@id": gitaBookNode()["@id"] },
            hasPart: slokas.map((s) => ({
              "@type": "CreativeWork",
              "@id": `${absoluteUrl(`/sloka/${s.id}`)}#verse`,
              name: `Bhagavad Gita ${formatVerseRef(s)}`,
              position: s.verse_number,
              url: absoluteUrl(`/sloka/${s.id}`),
            })),
          },
          gitaBookNode(),
          breadcrumbNode(path, [
            { name: "MindKshetra", path: "/" },
            { name: "Bhagavad Gita", path: "/explore" },
            { name: chapterName },
          ]),
        ]}
      />
      <ChapterProgressBridge
        chapter={chapter}
        meta={meta}
        slokas={slokas.map(toCardSloka)}
      />
    </>
  );
}
