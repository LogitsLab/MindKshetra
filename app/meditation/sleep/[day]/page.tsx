import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SleepEveningClient from "@/components/SleepEveningClient";
import { enrichTranscripts, loadGoalTrack } from "@/lib/meditation";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ day: string }> };

export function generateStaticParams() {
  return [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day: String(day) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { day } = await params;
  const n = Number(day);
  const session = loadGoalTrack("sleep-7")?.days.find((d) => d.day_number === n);
  if (!session) notFound();
  return pageMetadata({
    title: `${session.title_en} · Seven evenings`,
    description: session.theme_en,
    path: `/meditation/sleep/${n}`,
  });
}

export default async function SleepEveningPage({ params }: Props) {
  const { day } = await params;
  const n = Number(day);
  const session = loadGoalTrack("sleep-7")?.days.find((d) => d.day_number === n);
  if (!session) notFound();
  return (
    <div className="animate-fade">
      <SleepEveningClient session={enrichTranscripts(session)} />
    </div>
  );
}
