import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MeditationPlayerClient from "@/components/MeditationPlayerClient";
import {
  enrichTranscripts,
  getSessionById,
  loadDailySits,
} from "@/lib/meditation";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return (loadDailySits()?.sessions ?? []).map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = getSessionById(id);
  if (!session || session.tier !== "daily") notFound();
  return pageMetadata({
    title: `${session.title_en} · Meditation`,
    description: session.theme_en,
    path: `/meditation/daily/${session.id}`,
  });
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
