import { notFound } from "next/navigation";
import MoodDetailClient from "@/components/MoodDetailClient";
import { getMoodById } from "@/lib/moods";
import { getSlokasByTags } from "@/lib/slokas";

type Props = { params: { id: string } };

export default async function MoodDetailPage({ params }: Props) {
  const mood = await getMoodById(params.id);
  if (!mood) notFound();

  const slokas = (await getSlokasByTags(mood.tags)).slice(0, 40);
  return <MoodDetailClient mood={mood} slokas={slokas} />;
}
