import Link from "next/link";
import SlokaPageClient from "@/components/SlokaPageClient";
import { getChapterMeta } from "@/lib/chapters";
import {
  formatVerseRef,
  getAdjacentSlokas,
  getAllSlokas,
  getSlokaById,
  getTeachingPassage,
} from "@/lib/slokas";
import { splitVerseLines } from "@/lib/verseDisplay";

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

export default async function VerseOfTheDayPage() {
  const all = await getAllSlokas();
  const seed = daySeed();
  const sloka =
    (await getSlokaById(all[seed % all.length]?.id ?? 1)) ?? all[0];

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
