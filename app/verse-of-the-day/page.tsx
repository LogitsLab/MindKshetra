import Link from "next/link";
import SlokaPageClient from "@/components/SlokaPageClient";
import { getChapterMeta } from "@/lib/chapters";
import { getVerseOfTheDay } from "@/lib/day-seed";
import {
  formatVerseRef,
  getAdjacentSlokas,
  getTeachingPassage,
} from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";

export default async function VerseOfTheDayPage() {
  const sloka = await getVerseOfTheDay();

  if (!sloka) {
    return <p className="text-[var(--text-muted)]">Verse unavailable.</p>;
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
        <p className="mt-3 font-display text-lg leading-relaxed text-[var(--text-muted)]">
          {preview.join(" ")}
        </p>
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
