import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import MoodDetailClient from "@/components/MoodDetailClient";
import { moodSeo } from "@/lib/mood-seo";
import { getAllMoods, getMoodById } from "@/lib/moods";
import {
  breadcrumbNode,
  pageMetadata,
  publisherRef,
  SCHEMA_IDS,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { formatVerseRef, metaDescription, toCardSloka } from "@/lib/sloka-utils";
import { getSlokasByTags } from "@/lib/slokas";

type Props = { params: { id: string } };

// Mood pages derive from static tag data; pre-render all 18.
// force-static: see app/sloka/[id]/page.tsx — no-store DB fetches otherwise
// demote the prerender silently.
export const dynamic = "force-static";
export const revalidate = 86400;
// Every valid id is prerendered above; anything else is a real 404 from the
// router (it used to render on demand as a cached 200 + noindex soft 404).
export const dynamicParams = false;

export async function generateStaticParams() {
  const moods = await getAllMoods();
  return moods.map((mood) => ({ id: mood.id }));
}

/**
 * Mood pages are the product's front door for search — people arrive typing
 * how they feel, not a verse number. Copy comes from lib/mood-seo.ts; the
 * fallback covers a mood added to the database before its copy is written.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mood = await getMoodById(params.id);
  if (!mood) notFound();

  const seo = moodSeo(mood.id);
  return pageMetadata({
    title: seo?.title ?? `Bhagavad Gita verses for ${mood.label.toLowerCase()}`,
    description:
      seo?.description ??
      metaDescription(
        `Bhagavad Gita verses for when you feel ${mood.label.toLowerCase()}, with Sanskrit, Hindi and English meaning.`
      ),
    path: `/mood/${mood.id}`,
  });
}

export default async function MoodDetailPage({ params }: Props) {
  const mood = await getMoodById(params.id);
  if (!mood) notFound();

  const slokas = (await getSlokasByTags(mood.tags)).slice(0, 40);
  const seo = moodSeo(mood.id);
  const path = `/mood/${mood.id}`;
  const pageUrl = absoluteUrl(path);
  const name =
    seo?.heading ?? `Bhagavad Gita verses for ${mood.label.toLowerCase()}`;

  return (
    <>
      <JsonLd
        graph={[
          {
            "@type": "CollectionPage",
            "@id": `${pageUrl}#webpage`,
            url: pageUrl,
            name,
            inLanguage: "en",
            isPartOf: { "@id": SCHEMA_IDS.website() },
            breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
            publisher: publisherRef(),
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: slokas.length,
              itemListElement: slokas.map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: `Bhagavad Gita ${formatVerseRef(s)}`,
                url: absoluteUrl(`/sloka/${s.id}`),
              })),
            },
          },
          breadcrumbNode(path, [
            { name: "MindKshetra", path: "/" },
            { name: "Verses for how you feel", path: "/mood" },
            { name },
          ]),
        ]}
      />
      <MoodDetailClient
        mood={mood}
        slokas={slokas.map(toCardSloka)}
        heading={seo?.heading}
        pathId={seo?.pathId}
        showCare={seo?.care ?? false}
      />
    </>
  );
}
