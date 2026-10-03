import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { metaDescription } from "@/lib/sloka-utils";

export const SITE_NAME = "MindKshetra";

/**
 * Date the verse/chapter/mood content last changed. Feeds sitemap
 * `lastModified` — bump it when data/slokas.json, data/chapters.json or the
 * content tables change, so crawlers can trust the field.
 */
export const CONTENT_LAST_MODIFIED = "2026-10-04";

export const DEFAULT_OG_IMAGE = {
  url: "/images/og.jpg",
  width: 1200,
  height: 630,
  alt: "MindKshetra — a Bhagavad Gita companion",
};

type PageImage = { url: string; alt: string; width?: number; height?: number };

type PageMetadataInput = {
  /** Page title; the root layout's template appends " · MindKshetra". */
  title: string;
  description: string;
  /** Site path for the canonical and og:url, e.g. "/mood/anxious". */
  path: string;
  image?: PageImage;
  type?: "website" | "article";
  /** Keep out of the index but let crawlers follow links. */
  noindex?: boolean;
  /** Use `title` verbatim instead of passing it through the template. */
  absoluteTitle?: boolean;
};

/**
 * One place that builds a page's title, description, canonical, Open Graph
 * and Twitter tags.
 *
 * Pages used to set `title`/`description` only, so they inherited the root
 * layout's Open Graph block wholesale: fifteen templates shared as a card
 * titled "MindKshetra" with the home blurb, and most had no canonical at all.
 * Child metadata replaces a parent's `openGraph` object rather than merging
 * it, which is why every field is restated here.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const ogImage = {
    url: image.url,
    width: image.width ?? 1200,
    height: image.height ?? 630,
    alt: image.alt,
  };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type,
      url: path,
      siteName: SITE_NAME,
      locale: "en_IN",
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

/** Metadata for per-user and utility routes: never indexed, links still followed. */
export const NOINDEX: Metadata = { robots: { index: false, follow: true } };

/** Stable @id values so every page's JSON-LD points at the same entities. */
export const SCHEMA_IDS = {
  organization: () => `${absoluteUrl()}/#organization`,
  website: () => `${absoluteUrl()}/#website`,
  book: () => `${absoluteUrl("/explore")}#book`,
};

/** The Bhagavad Gita as an entity, restated minimally on pages that cite it. */
export function gitaBookNode() {
  return {
    "@type": "Book",
    "@id": SCHEMA_IDS.book(),
    name: "Bhagavad Gita",
    alternateName: ["Bhagavad Gītā", "भगवद्गीता", "Gita"],
    inLanguage: "sa",
    url: absoluteUrl("/explore"),
    author: {
      "@type": "Person",
      name: "Vyasa",
      sameAs: "https://www.wikidata.org/wiki/Q330521",
    },
    isPartOf: {
      "@type": "Book",
      name: "Mahabharata",
      sameAs: "https://www.wikidata.org/wiki/Q8276",
    },
    sameAs: "https://www.wikidata.org/wiki/Q46802",
  };
}

/** Reference to the sitewide publisher defined on the home page. */
export function publisherRef() {
  return { "@id": SCHEMA_IDS.organization() };
}

export type BreadcrumbItem = { name: string; path?: string };

export function breadcrumbNode(pagePath: string, items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(pagePath)}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/**
 * Verse titles lead with the reference people type ("Bhagavad Gita 2.47"),
 * add the verse's popular name where it has one ("Karmanye Vadhikaraste") and
 * say "meaning", which most verse searches include. The English chapter name
 * used to fill this slot: 20–50 characters nobody searches for, pushing half
 * the titles past the point where results truncate them.
 */
export function verseSeoTitle(ref: string, popularName?: string): string {
  return popularName
    ? `Bhagavad Gita ${ref}: ${popularName} – Meaning`
    : `Bhagavad Gita ${ref}: Meaning and Translation`;
}

const VERSE_DESCRIPTION_MAX = 160;

export function verseSeoDescription(ref: string, translation: string): string {
  const lead = `Bhagavad Gita ${ref} meaning: “`;
  const tail = "” In Sanskrit, Hindi and English, with word meanings.";
  const room = VERSE_DESCRIPTION_MAX - lead.length - tail.length;
  return `${lead}${metaDescription(translation, room)}${tail}`;
}

export function chapterSeoTitle(chapter: number, romanizedName: string): string {
  return `Bhagavad Gita Chapter ${chapter}: ${romanizedName}`;
}

export function chapterSeoDescription(input: {
  chapter: number;
  romanizedName: string;
  name: string;
  versesCount: number;
  moral?: string;
}): string {
  const base = `Chapter ${input.chapter} of the Bhagavad Gita, ${input.romanizedName} (${input.name}): ${input.versesCount} verses in Sanskrit, Hindi and English with meaning.`;
  return metaDescription(input.moral ? `${base} ${input.moral}` : base, 160);
}
