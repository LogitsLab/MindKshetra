import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PathDetailClient from "@/components/PathDetailClient";
import { loadJourney } from "@/lib/journeys/content";
import { getSlokaByRef } from "@/lib/slokas";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const path = loadJourney(id);
  if (!path) return { title: "Path · MindKshetra" };
  return {
    title: `${path.title_en} · MindKshetra`,
    description: path.intro_en,
  };
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
