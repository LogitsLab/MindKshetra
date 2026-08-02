import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MeditationPlayerClient from "@/components/MeditationPlayerClient";
import { enrichTranscripts, getFoundationDay, loadFoundationProgram } from "@/lib/meditation";

type Props = { params: Promise<{ day: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { day: dayRaw } = await params;
  const day = Number(dayRaw);
  const session = getFoundationDay(day);
  if (!session) return { title: "Meditation · MindKshetra" };
  return {
    title: `${session.title_en} · Meditation · MindKshetra`,
    description: session.theme_en,
  };
}

export default async function MeditationDayPage({ params }: Props) {
  const { day: dayRaw } = await params;
  const day = Number(dayRaw);
  const program = loadFoundationProgram();
  if (!program || !Number.isInteger(day) || day < 1 || day > program.days_count) {
    notFound();
  }
  const session = getFoundationDay(day);
  if (!session) notFound();

  return (
    <div className="animate-fade">
      <MeditationPlayerClient session={enrichTranscripts(session)} />
    </div>
  );
}
