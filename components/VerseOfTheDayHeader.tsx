"use client";

import Link from "next/link";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * `/verse-of-the-day` is a static server page, so its header could not read the
 * language toggle and shipped four hardcoded English strings — "Verse of the
 * day", the Moon-nakshatra note and the Madhav link — on a page whose entire
 * body is bilingual.
 *
 * The H1 here is content, not copy: the verse ref. That is why
 * LocalizedPageHeader grew a `title` string alongside `titleKey`.
 */
export default function VerseOfTheDayHeader({
  verseRef,
  preview,
  nakshatra = null,
}: {
  verseRef: string;
  /** First lines of the Sanskrit, already split. */
  preview: string[];
  nakshatra?: string | null;
}) {
  const { t } = useLanguage();

  return (
    <LocalizedPageHeader
      eyebrowKey="votdEyebrow"
      title={verseRef}
      className="mb-6"
    >
      <p className="mt-3 font-devanagari text-lg leading-[1.9] text-[var(--text-soft)]">
        {preview.join(" ")}
      </p>
      {nakshatra ? (
        <p className="mt-2 text-sm font-light text-[var(--text-muted)]">
          {t("votdNakshatraNote").replace("{nakshatra}", nakshatra)}
        </p>
      ) : null}
      <Link
        href="/madhav"
        className="mt-4 inline-block text-sm text-[var(--brass-soft)] hover:underline"
      >
        {t("askMadhavVerse")} →
      </Link>
    </LocalizedPageHeader>
  );
}
