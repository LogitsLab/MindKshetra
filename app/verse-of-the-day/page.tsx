import LocalizedEmptyState from "@/components/LocalizedEmptyState";
import SlokaPageClient from "@/components/SlokaPageClient";
import VerseOfTheDayHeader from "@/components/VerseOfTheDayHeader";
import { getChapterMeta } from "@/lib/chapters";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import {
  formatVerseRef,
  getAdjacentSlokas,
  getTeachingPassage,
} from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";

// Matches the home page's cadence so the two surfaces rotate together.
// force-static: the content layer's DB fetches are no-store, which would
// otherwise keep this page dynamic despite the revalidate window.
export const dynamic = "force-static";
export const revalidate = 3600;

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
      <SlokaPageClient
        sloka={sloka}
        chapterMeta={getChapterMeta(sloka.chapter)}
        prev={prev}
        next={next}
        passage={passage}
      />
    </div>
  );
}
