"use client";

import Image from "next/image";
import Link from "next/link";
import ExploreSearch from "@/components/ExploreSearch";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChapterMeta } from "@/lib/chapters";

type Props = {
  chapters: ChapterMeta[];
};

export default function ExplorePageClient({ chapters }: Props) {
  const { lang, t } = useLanguage();

  return (
    <div className="animate-fade">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {t("exploreEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
          {t("exploreTitle")}
        </h1>
        <p className="mt-3 text-[var(--text-muted)]">{t("exploreIntro")}</p>
      </header>

      <ExploreSearch />

      <div className="mt-12">
        <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {t("chapters")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <Link
              key={chapter.number}
              href={`/explore/${chapter.number}`}
              className="surface group relative overflow-hidden p-5"
            >
              <Image
                src="/ornaments/chapter.svg"
                alt=""
                width={120}
                height={120}
                className="pointer-events-none absolute -right-2 -top-2 opacity-[0.12] transition duration-300 group-hover:opacity-[0.22]"
              />
              <span className="relative font-display text-5xl font-semibold text-white/[0.06] transition group-hover:text-[var(--brass)]/20">
                {String(chapter.number).padStart(2, "0")}
              </span>
              <div className="relative -mt-6">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--brass-soft)]">
                  {t("chapter")} {chapter.number}
                </p>
                <h2 className="mt-1 font-display text-xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                  {lang === "hi" ? chapter.name_sanskrit : chapter.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {lang === "hi" ? chapter.name : chapter.name_sanskrit}
                </p>
                <p className="mt-3 line-clamp-2 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                  {chapter.summary}
                </p>
                <p className="mt-4 text-xs text-[var(--brass)]">
                  {chapter.verses_count} {t("verses")} →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
