import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PathDetailClient from "@/components/PathDetailClient";
import { listJourneys, loadJourney } from "@/lib/journeys/content";
import { pageMetadata } from "@/lib/seo";
import { metaDescription } from "@/lib/sloka-utils";
import { getSlokaByRef } from "@/lib/slokas";

type Props = { params: Promise<{ id: string }> };

// Path content is static JSON; render every path at build. Unknown ids 404 at
// the router instead of streaming a 200 page with a late noindex.
// force-static: day verses come through the content layer's no-store fetches.
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return listJourneys().map((journey) => ({ id: journey.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const path = loadJourney(id);
  if (!path) notFound();
  return pageMetadata({
    title: `${path.title_en} — a Bhagavad Gita path`,
    description: metaDescription(path.intro_en),
    path: `/paths/${path.id}`,
  });
}

export default async function PathDetailPage({ params }: Props) {
  const { id } = await params;
  const path = loadJourney(id);
  if (!path) notFound();

  const dayVerses = await Promise.all(
    path.days.map(async (day) => {
      // Meditation days may carry no verse; scripture days always do.
      const sloka = day.ref
        ? await getSlokaByRef(day.ref.chapter, day.ref.verse)
        : null;
      return { day: day.day, slokaId: sloka?.id ?? null };
    })
  );

  return (
    <div className="animate-fade">
      <PathDetailClient path={path} dayVerses={dayVerses} />
    </div>
  );
}
