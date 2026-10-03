import type { Metadata } from "next";
import HomePageClient, {
  type FeaturedVerse,
} from "@/components/HomePageClient";
import JsonLd from "@/components/JsonLd";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import { pageMetadata, SCHEMA_IDS, SITE_NAME } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { formatVerseRef, getSlokaByRef } from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";

// force-static: nothing on this page is per-user (progress and favorites are
// client bridges). Without it the content layer's no-store fetches kept the
// home page dynamic in production — rendered per request, never edge-cached.
// The hourly revalidate rolls the verse of the day over within an hour of
// IST midnight, matching /verse-of-the-day.
export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "MindKshetra: Bhagavad Gita verses, meanings and daily guidance",
  description:
    "Read all 701 Bhagavad Gita verses in Sanskrit, Hindi and English with word meanings, find verses for how you feel, see today's Panchang, and ask Madhav.",
  path: "/",
  absoluteTitle: true,
});

/**
 * Sitewide entities, defined once here and referenced by @id from every
 * other page. WebSite on the home page is what search engines read for the
 * site name shown above results — important while two hosts served the same
 * app. The search action points at the real search URL; it is for machines,
 * not a SERP feature.
 */
function homeGraph() {
  const site = absoluteUrl();
  return [
    {
      "@type": "Organization",
      "@id": SCHEMA_IDS.organization(),
      name: SITE_NAME,
      url: site,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/brand/logo-512.png"),
        width: 512,
        height: 512,
      },
      description:
        "A free, open-source Bhagavad Gita companion: verses in Sanskrit, Hindi and English, verses for how you feel, daily practice, Panchang and Vedic astrology.",
      parentOrganization: {
        "@type": "Organization",
        name: "LogitsLab",
        url: "https://www.logitslab.com",
      },
      sameAs: [
        "https://github.com/LogitsLab/MindKshetra",
        ...[
          process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL,
          process.env.NEXT_PUBLIC_TELEGRAM_URL,
        ].filter((url): url is string => Boolean(url?.trim())),
      ],
    },
    {
      "@type": "WebSite",
      "@id": SCHEMA_IDS.website(),
      url: site,
      name: SITE_NAME,
      alternateName: ["Mind Kshetra", "MindKshetra Gita"],
      inLanguage: ["en", "hi"],
      publisher: { "@id": SCHEMA_IDS.organization() },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${absoluteUrl("/explore")}?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

async function toFeatured(offsetDays: number): Promise<FeaturedVerse | null> {
  const when = new Date(Date.now() + offsetDays * 86_400_000);
  const selection = await getVerseOfTheDaySelection(when);
  const sloka =
    selection?.sloka ?? (offsetDays === 0 ? await getSlokaByRef(2, 47) : null);
  if (!sloka) return null;

  return {
    id: sloka.id,
    chapter: sloka.chapter,
    verseNumber: sloka.verse_number,
    ref: formatVerseRef(sloka),
    sanskritLines: splitVerseLines(sloka.sanskrit_devanagari).slice(0, 2),
    english: sloka.english_translation,
    hindi: sloka.hindi_translation,
    nakshatra: selection?.nakshatra?.name ?? null,
  };
}

export default async function HomePage() {
  const featuredVerses: FeaturedVerse[] = [];
  const seen = new Set<number>();
  const candidates = await Promise.all([0, -1, -2].map(toFeatured));
  for (const verse of candidates) {
    if (!verse || seen.has(verse.id)) continue;
    seen.add(verse.id);
    featuredVerses.push(verse);
  }

  if (!featuredVerses[0]) {
    throw new Error("Featured verse missing from dataset");
  }

  return (
    <>
      <JsonLd graph={homeGraph()} />
      <HomePageClient
        featured={featuredVerses[0]}
        featuredVerses={featuredVerses}
      />
    </>
  );
}
