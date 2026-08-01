import Link from "next/link";
import LocalizedEmptyState from "@/components/LocalizedEmptyState";
import SlokaPageClient from "@/components/SlokaPageClient";
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
      <header className="mb-6 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          Verse of the day
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          {ref}
        </h1>
        <p className="mt-3 font-devanagari text-lg leading-[1.9] text-[var(--text-soft)]">
          {preview.join(" ")}
        </p>
        {selection?.nakshatra ? (
          <p className="mt-2 text-sm font-light text-[var(--text-muted)]">
            Chosen for today&rsquo;s Moon in {selection.nakshatra.name}
          </p>
        ) : null}
        <Link
          href="/madhav"
          className="mt-4 inline-block text-sm text-[var(--brass-soft)] hover:underline"
        >
          Ask Madhav about this verse →
        </Link>
      </header>
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
