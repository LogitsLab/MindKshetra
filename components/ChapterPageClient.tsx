"use client";

import Image from "next/image";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import SlokaCard from "@/components/SlokaCard";
import { useLanguage } from "@/components/LanguageProvider";
import { chapterMoral, type ChapterMeta } from "@/lib/chapters";
import type { Sloka } from "@/lib/types";

type Props = {
  chapter: number;
  meta?: ChapterMeta;
  slokas: Sloka[];
};

export default function ChapterPageClient({ chapter, meta, slokas }: Props) {
  const { lang, t } = useLanguage();
  const showJump = slokas.length >= 40;

  return (
    <div className="animate-fade">
      <Link
        href="/explore"
        className="text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
      >
        {t("allChapters")}
      </Link>
      <header className="relative mt-4 max-w-2xl">
        <Image
          src="/ornaments/chapter.svg"
          alt=""
          width={100}
          height={100}
          className="pointer-events-none absolute -right-2 -top-4 opacity-20 sm:right-0"
        />
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brass-soft)]">
          {t("chapter")} {chapter}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-5xl">
          {lang === "hi"
            ? meta?.name_sanskrit ?? `${t("chapter")} ${chapter}`
            : meta?.name ?? `${t("chapter")} ${chapter}`}
        </h1>
        {meta && (
          <p className="mt-2 font-display text-xl text-[var(--text-muted)]">
            {lang === "hi" ? meta.name : meta.name_sanskrit}
          </p>
        )}
        {meta?.summary && (
          <p className="mt-4 text-sm font-light leading-relaxed text-[var(--text-muted)]">
            {meta.summary}
          </p>
        )}
        {chapterMoral(meta, lang) ? (
          <div className="mt-5 border border-[var(--line)] bg-[rgba(14,20,32,0.35)] p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--brass-soft)]">
              {t("chapterMoral")}
            </p>
            <p className="mt-2 font-display text-lg leading-snug text-[var(--text)]">
              {chapterMoral(meta, lang)}
            </p>
          </div>
        ) : null}
        <p className="mt-3 text-sm text-[var(--brass)]">
          {slokas.length} {slokas.length === 1 ? t("verse") : t("verses")}
        </p>
      </header>

      {showJump && (
        <div className="mt-8">
          <p className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t("jumpToVerse")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {slokas.map((sloka) => (
              <a
                key={sloka.id}
                href={`#verse-${sloka.verse_number}`}
                className="inline-flex min-h-9 min-w-9 items-center justify-center border border-[var(--line)] px-2 text-xs text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
              >
                {sloka.verse_number}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-3">
        {slokas.length > 0 ? (
          slokas.map((sloka) => (
            <div
              key={sloka.id}
              id={`verse-${sloka.verse_number}`}
              className="scroll-mt-28"
            >
              <SlokaCard sloka={sloka} showChapter={false} />
            </div>
          ))
        ) : (
          <EmptyState title={t("noSearchResults")} />
        )}
      </div>
    </div>
  );
}
