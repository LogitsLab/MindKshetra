import HomePageClient, {
  type FeaturedVerse,
} from "@/components/HomePageClient";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import { formatVerseRef, getSlokaByRef } from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";

export const revalidate = 3600;

async function toFeatured(offsetDays: number): Promise<FeaturedVerse | null> {
  const when = new Date(Date.now() + offsetDays * 86_400_000);
  const selection = await getVerseOfTheDaySelection(when);
  const sloka =
    selection?.sloka ?? (offsetDays === 0 ? await getSlokaByRef(2, 47) : null);
  if (!sloka) return null;

  return {
    id: sloka.id,
    chapter: sloka.chapter,
    verseNumber: sloka.verse_number,
    ref: formatVerseRef(sloka),
    sanskritLines: splitVerseLines(sloka.sanskrit_devanagari).slice(0, 2),
    english: sloka.english_translation,
    hindi: sloka.hindi_translation,
    nakshatra: selection?.nakshatra?.name ?? null,
  };
}

export default async function HomePage() {
  const featuredVerses: FeaturedVerse[] = [];
  const seen = new Set<number>();
  for (const offset of [0, -1, -2]) {
    const verse = await toFeatured(offset);
    if (!verse || seen.has(verse.id)) continue;
    seen.add(verse.id);
    featuredVerses.push(verse);
  }

  if (!featuredVerses[0]) {
    throw new Error("Featured verse missing from dataset");
  }

  return (
    <HomePageClient
      featured={featuredVerses[0]}
      featuredVerses={featuredVerses}
    />
  );
}
