import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SleepBedClient from "@/components/SleepBedClient";
import { sleepTrackById, sleepTracks } from "@/lib/meditation-audio";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ trackId: string }> };

export function generateStaticParams() {
  return sleepTracks().map((t) => ({ trackId: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const track = sleepTrackById(trackId);
  if (!track) notFound();
  return pageMetadata({
    title: `${track.title_en} · Sleep`,
    description: `${track.credit}. ${track.license}.`,
    path: `/meditation/library/${track.id}`,
  });
}

export default async function SleepTrackPage({ params }: Props) {
  const { trackId } = await params;
  const track = sleepTrackById(trackId);
  if (!track) notFound();
  return (
    <div className="animate-fade">
      <SleepBedClient track={track} />
    </div>
  );
}
