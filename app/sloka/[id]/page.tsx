import { notFound } from "next/navigation";
import SlokaPageClient from "@/components/SlokaPageClient";
import { getChapterMeta } from "@/lib/chapters";
import { getAdjacentSlokas, getSlokaById, getTeachingPassage } from "@/lib/slokas";

type Props = { params: { id: string } };

export default async function SlokaPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const sloka = await getSlokaById(id);
  if (!sloka) notFound();

  const [{ prev, next }, passage] = await Promise.all([
    getAdjacentSlokas(id),
    getTeachingPassage(id),
  ]);

  return (
    <SlokaPageClient
      sloka={sloka}
      chapterMeta={getChapterMeta(sloka.chapter)}
      prev={prev}
      next={next}
      passage={passage}
    />
  );
}
