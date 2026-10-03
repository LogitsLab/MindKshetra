import type { Metadata } from "next";
import LocalizedEmptyState from "@/components/LocalizedEmptyState";
import SlokaPageClient from "@/components/SlokaPageClient";
import VerseOfTheDayHeader from "@/components/VerseOfTheDayHeader";
import { getChapterMeta } from "@/lib/chapters";
import { verseCredits } from "@/lib/commentary-sources";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import { pageMetadata } from "@/lib/seo";
import {
  formatVerseRef,
  getAdjacentSlokas,
  getTeachingPassage,
} from "@/lib/slokas";
import { versePopularName } from "@/lib/verse-names";
import { splitVerseLines } from "@/lib/verseDisplay";

// Matches the home page's cadence so the two surfaces rotate together.
// force-static: the content layer's DB fetches are no-store, which would
// otherwise keep this page dynamic despite the revalidate window.
export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Its own intent ("bhagavad gita verse of the day", "today's shloka"), so its
 * own title and canonical rather than the root defaults. The share card is
 * today's verse card.
 */
export async function generateMetadata(): Promise<Metadata> {
  const sloka = (await getVerseOfTheDaySelection())?.sloka;
  const ref = sloka ? formatVerseRef(sloka) : null;
  return pageMetadata({
    title: "Bhagavad Gita verse of the day (today's shloka)",
    description: `${
      ref ? `Today's Bhagavad Gita shloka is ${ref}: ` : "Today's Bhagavad Gita shloka: "
    }Sanskrit, transliteration, Hindi and English meaning, chosen for today's Moon. A new verse every day.`,
    path: "/verse-of-the-day",
    image: sloka
      ? { url: `/api/og/verse/${sloka.id}`, alt: `Bhagavad Gita ${ref}` }
      : undefined,
  });
}

export default async function VerseOfTheDayPage() {
  const selection = await getVerseOfTheDaySelection();
  const sloka = selection?.sloka ?? null;

  if (!sloka) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <LocalizedEmptyState
          titleKey="votdUnavailable"
          bodyKey="votdUnavailableBody"
        />
      </div>
    );
  }

  const [{ prev, next }, passage] = await Promise.all([
    getAdjacentSlokas(sloka.id),
    getTeachingPassage(sloka.id),
  ]);

  const ref = formatVerseRef(sloka);
  const preview = splitVerseLines(sloka.sanskrit_devanagari).slice(0, 2);

  return (
    <div className="animate-fade">
      <VerseOfTheDayHeader
        verseRef={ref}
        preview={preview}
        nakshatra={selection?.nakshatra?.name ?? null}
      />
      {/* The header above carries this page's H1, so the verse heading
          steps down to an H2 — the page used to ship two H1s. */}
      <SlokaPageClient
        sloka={sloka}
        chapterMeta={getChapterMeta(sloka.chapter)}
        prev={prev}
        next={next}
        passage={passage}
        popularName={versePopularName(sloka.chapter, sloka.verse_number)}
        credits={verseCredits(sloka.chapter, sloka.verse_number)}
        headingLevel="h2"
      />
    </div>
  );
}
