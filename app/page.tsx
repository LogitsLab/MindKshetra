import HomePageClient from "@/components/HomePageClient";
import { daySeed, getVerseOfTheDaySelection } from "@/lib/day-seed";
import { getAllMoods, getMoodById } from "@/lib/moods";
import { formatVerseRef, getSlokaByRef } from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";
import type { Mood } from "@/lib/types";

const PREVIEW_MOOD_POOL = [
  "anxious",
  "confused",
  "grieving",
  "hopeful",
  "purpose",
  "happy",
  "lonely",
  "overwhelmed",
  "fearful",
  "grateful",
  "angry",
  "failure",
] as const;

export const revalidate = 3600;

export default async function HomePage() {
  const seed = daySeed();
  // Content layer falls back to JSON on DB timeout (Postgres 57014) so SSG
  // does not fail the Vercel build.
  const selection = await getVerseOfTheDaySelection();
  const featuredSloka = selection?.sloka ?? (await getSlokaByRef(2, 47));

  if (!featuredSloka) {
    throw new Error("Featured verse missing from dataset");
  }

  const featured = {
    id: featuredSloka.id,
    ref: formatVerseRef(featuredSloka),
    sanskritLines: splitVerseLines(featuredSloka.sanskrit_devanagari).slice(
      0,
      2
    ),
    english: featuredSloka.english_translation,
    hindi: featuredSloka.hindi_translation,
    // Why-this-verse provenance; absent on the engine-fallback rotation.
    nakshatra: selection?.nakshatra?.name ?? null,
  };

  const moods = await getAllMoods();
  const previewMoods: Mood[] = [];
  for (let i = 0; i < 6; i++) {
    const id = PREVIEW_MOOD_POOL[(seed + i * 3) % PREVIEW_MOOD_POOL.length];
    const mood = (await getMoodById(id)) ?? moods[i];
    if (mood && !previewMoods.some((m) => m.id === mood.id)) {
      previewMoods.push(mood);
    }
  }
  while (previewMoods.length < 6 && moods[previewMoods.length]) {
    previewMoods.push(moods[previewMoods.length]);
  }

  return <HomePageClient featured={featured} previewMoods={previewMoods} />;
}
