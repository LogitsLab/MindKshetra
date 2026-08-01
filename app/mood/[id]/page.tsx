import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MoodDetailClient from "@/components/MoodDetailClient";
import { getAllMoods, getMoodById } from "@/lib/moods";
import { metaDescription } from "@/lib/sloka-utils";
import { getSlokasByTags } from "@/lib/slokas";

type Props = { params: { id: string } };

// Mood pages derive from static tag data; pre-render all 18.
// force-static: see app/sloka/[id]/page.tsx — no-store DB fetches otherwise
// demote the prerender silently.
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const moods = await getAllMoods();
  return moods.map((mood) => ({ id: mood.id }));
}

/**
 * Mood pages are the product's front door for search — people arrive typing how
 * they feel, not a verse number — and all 18 shared the generic site title.
 * No per-mood OG route exists, so the card stays the site image.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mood = await getMoodById(params.id);
  if (!mood) return {};

  const title = `Feeling ${mood.label.toLowerCase()} · Bhagavad Gita verses`;
  const description = metaDescription(
    `Verses from the Bhagavad Gita for ${mood.label.toLowerCase()} — on ${mood.tags
      .slice(0, 4)
      .map((tag) => tag.replace(/_/g, " "))
      .join(", ")} — with translation, meaning and commentary.`
  );
  const url = `/mood/${mood.id}`;

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

export default async function MoodDetailPage({ params }: Props) {
  const mood = await getMoodById(params.id);
  if (!mood) notFound();

  const slokas = (await getSlokasByTags(mood.tags)).slice(0, 40);
  return <MoodDetailClient mood={mood} slokas={slokas} />;
}
