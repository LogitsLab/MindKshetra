import HomePageClient from "@/components/HomePageClient";
import { getMoodById } from "@/lib/moods";
import { formatVerseRef, getSlokaByRef } from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";
import type { Mood } from "@/lib/types";

const PREVIEW_MOOD_IDS = [
  "anxious",
  "confused",
  "grieving",
  "hopeful",
  "purpose",
  "happy",
] as const;

export default function HomePage() {
  const sloka = getSlokaByRef(2, 47);
  if (!sloka) {
    throw new Error("Featured verse 2.47 missing from dataset");
  }

  const featured = {
    id: sloka.id,
    ref: formatVerseRef(sloka),
    sanskritLines: splitVerseLines(sloka.sanskrit_devanagari).slice(0, 2),
    english: sloka.english_translation,
    hindi: sloka.hindi_translation,
  };

  const previewMoods = PREVIEW_MOOD_IDS.map((id) => getMoodById(id)).filter(
    (m): m is Mood => Boolean(m)
  );

  return <HomePageClient featured={featured} previewMoods={previewMoods} />;
}
