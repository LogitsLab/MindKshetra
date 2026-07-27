import HomePageClient from "@/components/HomePageClient";
import { getAllMoods, getMoodById } from "@/lib/moods";
import {
  formatVerseRef,
  getSlokaById,
  getSlokaByRef,
} from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";
import type { Mood } from "@/lib/types";

/** Daily featured verse rotates without loading the full corpus at build time. */
const SLOKA_COUNT = 701;

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

function daySeed(): number {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return Math.floor((today - start) / 86_400_000);
}

export const revalidate = 3600;

export default async function HomePage() {
  const seed = daySeed();
  const featuredId = (seed % SLOKA_COUNT) + 1;
  const featuredSloka =
    (await getSlokaById(featuredId)) ?? (await getSlokaByRef(2, 47));

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
