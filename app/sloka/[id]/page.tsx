import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SlokaPageClient from "@/components/SlokaPageClient";
import { getChapterMeta } from "@/lib/chapters";
import {
  formatVerseRef,
  metaDescription,
  rankRelatedSlokas,
  toRelatedVersePreview,
} from "@/lib/sloka-utils";
import {
  getAdjacentSlokas,
  getAllSlokas,
  getSlokaById,
  getSlokasByTags,
  getTeachingPassage,
} from "@/lib/slokas";

type Props = { params: { id: string } };

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Verse content is immutable; pre-rendering all 701 pages makes navigation
// (and Link prefetch) instant instead of a cold SSR round-trip per click.
// Progress/favorites are client bridges, so nothing here is per-user.
// force-static: DB-mode content fetches are no-store, which otherwise
// silently demotes these pages to dynamic at build persist time (the route
// table still shows ● but the prerender manifest stays empty).
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const all = await getAllSlokas();
  return all.map((sloka) => ({ id: String(sloka.id) }));
}

/**
 * Per-verse share cards.
 *
 * `/api/og/verse/[id]` has been rendering a proper card — the ref, the
 * Devanagari, the translation — since it was built, and not one of the 701
 * verse pages referenced it. Every share of every verse showed the same
 * generic site image, which is to say sharing a verse communicated nothing
 * about the verse. This is the whole fix: point at the route that already
 * exists.
 *
 * Image URLs stay relative; `metadataBase` in the root layout makes them
 * absolute. JSON-LD cannot rely on that, so it builds its own.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number(params.id);
  const sloka = Number.isInteger(id) ? await getSlokaById(id) : null;
  if (!sloka) return {};

  const ref = formatVerseRef(sloka);
  const chapter = getChapterMeta(sloka.chapter);
  const title = chapter
    ? `Bhagavad Gita ${ref} · ${chapter.name}`
    : `Bhagavad Gita ${ref}`;
  const description = metaDescription(sloka.english_translation);
  const url = `/sloka/${sloka.id}`;
  const image = `/api/og/verse/${sloka.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: `Bhagavad Gita ${ref}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function SlokaPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const sloka = await getSlokaById(id);
  if (!sloka) notFound();

  const [{ prev, next }, passage, tagMatches] = await Promise.all([
    getAdjacentSlokas(id),
    getTeachingPassage(id),
    sloka.tags.length > 0 ? getSlokasByTags(sloka.tags) : Promise.resolve([]),
  ]);

  // Related-verse interlinks ride the static prerender (SEO + engagement):
  // ranked server-side by shared-tag overlap, serialized as slim previews.
  const related = rankRelatedSlokas(sloka, tagMatches).map(
    toRelatedVersePreview
  );

  const ref = formatVerseRef(sloka);
  const chapterMeta = getChapterMeta(sloka.chapter);

  // One @graph rather than two <script> tags: the breadcrumb and the article
  // describe the same page, and a single node set lets the article reference
  // the trail by id instead of restating it.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${site}/sloka/${sloka.id}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "MindKshetra", item: site },
          {
            "@type": "ListItem",
            position: 2,
            name: "Bhagavad Gita",
            item: `${site}/explore`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: chapterMeta
              ? `Chapter ${sloka.chapter}: ${chapterMeta.name}`
              : `Chapter ${sloka.chapter}`,
            item: `${site}/explore/${sloka.chapter}`,
          },
          { "@type": "ListItem", position: 4, name: `Verse ${ref}` },
        ],
      },
      {
        "@type": "Article",
        "@id": `${site}/sloka/${sloka.id}#article`,
        mainEntityOfPage: `${site}/sloka/${sloka.id}`,
        headline: `Bhagavad Gita ${ref}`,
        description: metaDescription(sloka.english_translation),
        image: `${site}/api/og/verse/${sloka.id}`,
        inLanguage: "en",
        articleSection: chapterMeta?.name ?? `Chapter ${sloka.chapter}`,
        keywords: sloka.tags.join(", "),
        isPartOf: {
          "@type": "Book",
          name: "Bhagavad Gita",
          inLanguage: "sa",
        },
        breadcrumb: { "@id": `${site}/sloka/${sloka.id}#breadcrumb` },
        publisher: {
          "@type": "Organization",
          name: "MindKshetra",
          url: site,
          logo: `${site}/brand/mark.svg`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify does not escape "<", so a literal "</script>" anywhere
        // in the data would close this tag early. The content layer is ours, but
        // the escape costs nothing and the failure mode is XSS.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SlokaPageClient
        sloka={sloka}
        chapterMeta={chapterMeta}
        prev={prev}
        next={next}
        passage={passage}
        related={related}
      />
    </>
  );
}
