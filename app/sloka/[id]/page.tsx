import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import SlokaPageClient from "@/components/SlokaPageClient";
import { chapterRomanizedName, getChapterMeta } from "@/lib/chapters";
import { verseCredits } from "@/lib/commentary-sources";
import { getAllMoods } from "@/lib/moods";
import {
  breadcrumbNode,
  gitaBookNode,
  pageMetadata,
  publisherRef,
  SCHEMA_IDS,
  verseSeoDescription,
  verseSeoTitle,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import {
  formatVerseRef,
  metaDescription,
  rankRelatedSlokas,
  relatedMoods,
  toRelatedVersePreview,
} from "@/lib/sloka-utils";
import {
  getAdjacentSlokas,
  getAllSlokas,
  getSlokaById,
  getSlokasByTags,
  getTeachingPassage,
} from "@/lib/slokas";
import { versePopularName } from "@/lib/verse-names";

type Props = { params: { id: string } };

// Verse content is immutable; pre-rendering all 701 pages makes navigation
// (and Link prefetch) instant instead of a cold SSR round-trip per click.
// Progress/favorites are client bridges, so nothing here is per-user.
// force-static: DB-mode content fetches are no-store, which otherwise
// silently demotes these pages to dynamic at build persist time (the route
// table still shows ● but the prerender manifest stays empty).
export const dynamic = "force-static";
export const revalidate = 86400;
// Every valid id is prerendered above; anything else is a real 404 from the
// router (it used to render on demand as a cached 200 + noindex soft 404).
export const dynamicParams = false;

export async function generateStaticParams() {
  const all = await getAllSlokas();
  return all.map((sloka) => ({ id: String(sloka.id) }));
}

async function loadSloka(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) ? getSlokaById(id) : undefined;
}

/**
 * Per-verse share cards come from `/api/og/verse/[id]`; image URLs stay
 * relative and `metadataBase` in the root layout makes them absolute.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sloka = await loadSloka(params.id);
  // notFound() here, not `return {}`: metadata resolves before the root
  // loading boundary streams, so this is what makes a bad id a real 404.
  if (!sloka) notFound();

  const ref = formatVerseRef(sloka);
  return pageMetadata({
    title: verseSeoTitle(ref, versePopularName(sloka.chapter, sloka.verse_number)),
    description: verseSeoDescription(ref, sloka.english_translation),
    path: `/sloka/${sloka.id}`,
    type: "article",
    image: { url: `/api/og/verse/${sloka.id}`, alt: `Bhagavad Gita ${ref}` },
  });
}

export default async function SlokaPage({ params }: Props) {
  const sloka = await loadSloka(params.id);
  if (!sloka) notFound();
  const id = sloka.id;

  const [{ prev, next }, passage, tagMatches, moods] = await Promise.all([
    getAdjacentSlokas(id),
    getTeachingPassage(id),
    sloka.tags.length > 0 ? getSlokasByTags(sloka.tags) : Promise.resolve([]),
    getAllMoods(),
  ]);

  // Related-verse interlinks ride the static prerender (SEO + engagement):
  // ranked server-side by shared-tag overlap, serialized as slim previews.
  // Verses in this page's teaching passage are already listed there.
  const passageIds = new Set(passage?.verses.map((v) => v.id) ?? []);
  const related = rankRelatedSlokas(
    sloka,
    tagMatches.filter((s) => !passageIds.has(s.id))
  ).map(toRelatedVersePreview);

  const ref = formatVerseRef(sloka);
  const chapterMeta = getChapterMeta(sloka.chapter);
  const popularName = versePopularName(sloka.chapter, sloka.verse_number);
  const credits = verseCredits(sloka.chapter, sloka.verse_number);
  const moodLinks = relatedMoods(sloka, moods);

  const path = `/sloka/${id}`;
  const pageUrl = absoluteUrl(path);
  const chapterPath = `/explore/${sloka.chapter}`;
  const chapterName = chapterMeta
    ? `Chapter ${sloka.chapter}: ${chapterRomanizedName(chapterMeta)}`
    : `Chapter ${sloka.chapter}`;

  /**
   * The page is about a verse of a scripture, not an article MindKshetra
   * wrote, so the main entity is the verse itself, placed in its chapter and
   * in the Bhagavad Gita (Wikidata Q46802). Translation and commentary are
   * credited to their actual authors.
   */
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: verseSeoTitle(ref, popularName),
      description: metaDescription(sloka.english_translation),
      inLanguage: "en",
      isPartOf: { "@id": SCHEMA_IDS.website() },
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      primaryImageOfPage: absoluteUrl(`/api/og/verse/${id}`),
      mainEntity: { "@id": `${pageUrl}#verse` },
      publisher: publisherRef(),
    },
    {
      "@type": "CreativeWork",
      "@id": `${pageUrl}#verse`,
      name: `Bhagavad Gita ${ref}`,
      ...(popularName ? { alternateName: popularName } : {}),
      position: sloka.verse_number,
      inLanguage: "sa",
      text: sloka.sanskrit_devanagari,
      isPartOf: {
        "@type": "Chapter",
        "@id": `${absoluteUrl(chapterPath)}#chapter`,
        name: chapterName,
        position: sloka.chapter,
        url: absoluteUrl(chapterPath),
        isPartOf: { "@id": gitaBookNode()["@id"] },
      },
      ...(sloka.tags.length > 0
        ? { keywords: sloka.tags.map((t) => t.replace(/_/g, " ")).join(", ") }
        : {}),
      workTranslation: [
        {
          "@type": "CreativeWork",
          inLanguage: "en",
          text: sloka.english_translation,
          // A modernised adaptation, so "based on" rather than "translator".
          ...(credits.englishTranslation
            ? {
                isBasedOn: {
                  "@type": "CreativeWork",
                  author: { "@type": "Person", name: credits.englishTranslation },
                },
              }
            : {}),
        },
        {
          "@type": "CreativeWork",
          inLanguage: "hi",
          text: sloka.hindi_translation,
          ...(credits.hindiTranslation
            ? { translator: { "@type": "Person", name: credits.hindiTranslation } }
            : {}),
        },
      ],
    },
    gitaBookNode(),
    breadcrumbNode(path, [
      { name: "MindKshetra", path: "/" },
      { name: "Bhagavad Gita", path: "/explore" },
      { name: chapterName, path: chapterPath },
      { name: `Verse ${ref}` },
    ]),
  ];

  return (
    <>
      <JsonLd graph={graph} />
      <SlokaPageClient
        sloka={sloka}
        chapterMeta={chapterMeta}
        prev={prev}
        next={next}
        passage={passage}
        related={related}
        popularName={popularName}
        credits={credits}
        moodLinks={moodLinks}
      />
    </>
  );
}
