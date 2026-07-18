"use client";

import Link from "next/link";
import SlokaDetail from "@/components/SlokaDetail";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChapterMeta } from "@/lib/chapters";
import type { Sloka } from "@/lib/types";

type Props = {
  sloka: Sloka;
  chapterMeta?: ChapterMeta;
};

export default function SlokaPageClient({ sloka, chapterMeta }: Props) {
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
        <SlokaDetail sloka={sloka} chapterMeta={chapterMeta} />
      </div>
    </div>
  );
}
