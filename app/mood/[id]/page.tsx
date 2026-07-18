import { notFound } from "next/navigation";
import MoodDetailClient from "@/components/MoodDetailClient";
import { getMoodById } from "@/lib/moods";
import { getSlokasByTags } from "@/lib/slokas";

type Props = { params: { id: string } };

export default function MoodDetailPage({ params }: Props) {
  const mood = getMoodById(params.id);
  if (!mood) notFound();

  const slokas = getSlokasByTags(mood.tags).slice(0, 40);
  return <MoodDetailClient mood={mood} slokas={slokas} />;
}
