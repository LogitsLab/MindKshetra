import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MeditationPlayerClient from "@/components/MeditationPlayerClient";
import { enrichTranscripts, getSessionById } from "@/lib/meditation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = getSessionById(id);
  if (!session || session.tier !== "daily") {
    return { title: "Meditation · MindKshetra" };
  }
  return {
    title: `${session.title_en} · Meditation · MindKshetra`,
    description: session.theme_en,
  };
}

export default async function MeditationDailyPage({ params }: Props) {
  const { id } = await params;
  const session = getSessionById(id);
  if (!session || session.tier !== "daily") notFound();

  return (
    <div className="animate-fade">
      <MeditationPlayerClient session={enrichTranscripts(session)} />
    </div>
  );
}
