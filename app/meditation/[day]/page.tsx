import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MeditationPlayerClient from "@/components/MeditationPlayerClient";
import {
  enrichTranscripts,
  getSittingDay,
  loadSittingProgram,
} from "@/lib/meditation";

import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ day: string }> };

// The sitting course is static JSON: build every day, 404 anything else.
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  const program = loadSittingProgram();
  if (!program) return [];
  return Array.from({ length: program.days_count }, (_, i) => ({
    day: String(i + 1),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { day: dayRaw } = await params;
  const session = getSittingDay(Number(dayRaw));
  if (!session) notFound();
  return pageMetadata({
    title: `Day ${dayRaw}: ${session.title_en} · Meditation`,
    description: session.theme_en,
    path: `/meditation/${dayRaw}`,
  });
}

export default async function MeditationDayPage({ params }: Props) {
  const { day: dayRaw } = await params;
  const day = Number(dayRaw);
  const program = loadSittingProgram();
  if (!program || !Number.isInteger(day) || day < 1 || day > program.days_count) {
    notFound();
  }
  const session = getSittingDay(day);
  if (!session) notFound();

  return (
    <div className="animate-fade">
      <MeditationPlayerClient
        session={enrichTranscripts(session)}
        daysCount={program.days_count}
      />
    </div>
  );
}
