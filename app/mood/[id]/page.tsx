import { notFound } from "next/navigation";
import MoodDetailClient from "@/components/MoodDetailClient";
import { getAllMoods, getMoodById } from "@/lib/moods";
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

export default async function MoodDetailPage({ params }: Props) {
  const mood = await getMoodById(params.id);
  if (!mood) notFound();

  const slokas = (await getSlokasByTags(mood.tags)).slice(0, 40);
  return <MoodDetailClient mood={mood} slokas={slokas} />;
}
