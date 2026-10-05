"use client";

import Link from "next/link";
import SlokaDetail from "@/components/SlokaDetail";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChapterMeta } from "@/lib/chapters";
import type { VerseCredits } from "@/lib/commentary-sources";
import type { Sloka } from "@/lib/types";
import type {
  MoodLink,
  RelatedVersePreview,
  TeachingPassage,
} from "@/lib/sloka-utils";

type Props = {
  sloka: Sloka;
  chapterMeta?: ChapterMeta;
  prev?: Sloka | null;
  next?: Sloka | null;
  passage?: TeachingPassage | null;
  related?: RelatedVersePreview[];
  popularName?: string;
  credits?: VerseCredits;
  moodLinks?: MoodLink[];
  /** "h2" where the page already has its own H1 (verse of the day). */
  headingLevel?: "h1" | "h2";
};

export default function SlokaPageClient({
  sloka,
  chapterMeta,
  prev,
  next,
  passage,
  related,
  popularName,
  credits,
  moodLinks,
  headingLevel,
}: Props) {
  const { t } = useLanguage();

  return (
    <div>
      <Link
        href={`/explore/${sloka.chapter}`}
        className="text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
      >
        {t("backChapter")} {sloka.chapter}
      </Link>
      <div className="mt-4">
        <SlokaDetail
          sloka={sloka}
          chapterMeta={chapterMeta}
          prev={prev}
          next={next}
          passage={passage}
          related={related}
          popularName={popularName}
          credits={credits}
          moodLinks={moodLinks}
          headingLevel={headingLevel}
        />
      </div>
    </div>
  );
}
