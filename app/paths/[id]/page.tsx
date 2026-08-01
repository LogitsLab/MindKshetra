import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PathDetailClient from "@/components/PathDetailClient";
import { loadPracticePath } from "@/lib/paths";
import { getSlokaByRef } from "@/lib/slokas";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const path = loadPracticePath(id);
  if (!path) return { title: "Path · MindKshetra" };
  return {
    title: `${path.title_en} · MindKshetra`,
    description: path.intro_en,
  };
}

export default async function PathDetailPage({ params }: Props) {
  const { id } = await params;
  const path = loadPracticePath(id);
  if (!path) notFound();

  const dayVerses = await Promise.all(
    path.days.map(async (day) => {
      const sloka = await getSlokaByRef(day.ref.chapter, day.ref.verse);
      return { day: day.day, slokaId: sloka?.id ?? null };
    })
  );

  return (
    <div className="animate-fade">
      <PathDetailClient path={path} dayVerses={dayVerses} />
    </div>
  );
}
