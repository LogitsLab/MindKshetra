"use client";

import Link from "next/link";
import SlokaDetail from "@/components/SlokaDetail";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChapterMeta } from "@/lib/chapters";
import type { Sloka } from "@/lib/types";
import type { RelatedVersePreview, TeachingPassage } from "@/lib/sloka-utils";

type Props = {
  sloka: Sloka;
  chapterMeta?: ChapterMeta;
  prev?: Sloka | null;
  next?: Sloka | null;
  passage?: TeachingPassage | null;
  related?: RelatedVersePreview[];
};

export default function SlokaPageClient({
  sloka,
  chapterMeta,
  prev,
  next,
  passage,
  related,
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
        />
      </div>
    </div>
  );
}
