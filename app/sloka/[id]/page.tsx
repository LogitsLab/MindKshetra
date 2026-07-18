import { notFound } from "next/navigation";
import SlokaPageClient from "@/components/SlokaPageClient";
import { getChapterMeta } from "@/lib/chapters";
import { getSlokaById } from "@/lib/slokas";

type Props = { params: { id: string } };

export default function SlokaPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const sloka = getSlokaById(id);
  if (!sloka) notFound();

  return (
    <SlokaPageClient
      sloka={sloka}
      chapterMeta={getChapterMeta(sloka.chapter)}
    />
  );
}
