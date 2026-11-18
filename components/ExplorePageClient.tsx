"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import ExploreSearch from "@/components/ExploreSearch";
import { useLanguage } from "@/components/LanguageProvider";
import {
  chapterMoral,
  chapterSubtitle,
  chapterSummary,
  chapterTags,
  chapterTitle,
  type ChapterMeta,
} from "@/lib/chapters";

type Props = {
  chapters: ChapterMeta[];
  continueHref?: string | null;
};

export default function ExplorePageClient({
  chapters,
  continueHref = null,
}: Props) {
  const { lang, t } = useLanguage();
  const [searchActive, setSearchActive] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const tagOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const chapter of chapters) {
      const en = chapter.tags ?? [];
      const hi = chapter.tags_hi ?? [];
      en.forEach((tag, i) => {
        const key = tag.trim().toLowerCase();
        if (!key || map.has(key)) return;
        map.set(key, lang === "hi" && hi[i] ? hi[i] : tag);
      });
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, lang === "hi" ? "hi" : "en"));
  }, [chapters, lang]);

  const visible = useMemo(() => {
    if (!tagFilter) return chapters;
    return chapters.filter((c) =>
      (c.tags ?? []).some((tag) => tag.trim().toLowerCase() === tagFilter)
    );
  }, [chapters, tagFilter]);

  return (
    <div className="animate-fade">
      <header className="max-w-2xl">
        <p className="eyebrow text-[var(--brass-soft)]">
          {t("exploreEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
          {t("exploreTitle")}
        </h1>
        <p className="mt-3 text-[var(--text-muted)]">{t("exploreIntro")}</p>
        {continueHref ? (
          <Link
            href={continueHref}
            className="mt-5 inline-flex min-h-11 items-center bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            {t("continueReading")}
          </Link>
        ) : null}
      </header>

      <Suspense fallback={<div className="mt-8 h-20" aria-hidden />}>
        <ExploreSearch onActiveChange={setSearchActive} />
      </Suspense>

      {!searchActive ? (
        <div className="mt-12" id="chapters">
          <p className="eyebrow mb-3 text-[var(--text-muted)]">
            {t("chapterFilterLabel")}
          </p>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`border px-3 py-1.5 text-[11px] tracking-[0.06em] transition ${
                tagFilter == null
                  ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass-soft)]"
                  : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/45"
              }`}
            >
              {t("chapterFilterAll")}
            </button>
            {tagOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setTagFilter((cur) => (cur === key ? null : key))
                }
                className={`border px-3 py-1.5 text-[11px] tracking-[0.06em] transition ${
                  tagFilter === key
                    ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/45"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="eyebrow mb-4 text-[var(--text-muted)]">
            {t("chapters")}
            {tagFilter ? ` · ${visible.length}` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((chapter) => (
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
                  <p className="eyebrow text-[var(--brass-soft)]">
                    {t("chapter")} {chapter.number}
                  </p>
                  <h2 className="mt-1 font-display text-xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                    {chapterTitle(chapter, lang)}
                  </h2>
                  {chapterSubtitle(chapter, lang) ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {chapterSubtitle(chapter, lang)}
                    </p>
                  ) : null}
                  {chapterTags(chapter, lang).length ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {chapterTags(chapter, lang)
                        .slice(0, 4)
                        .map((tag) => (
                          <li
                            key={tag}
                            className="border border-[var(--line)] px-2 py-0.5 text-[10px] tracking-[0.06em] text-[var(--brass-soft)]"
                          >
                            {tag}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                  {chapterSummary(chapter, lang) ? (
                    <p className="mt-3 line-clamp-3 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                      {chapterSummary(chapter, lang)
                        .split(/\n\n+/)[0]
                        ?.trim()}
                    </p>
                  ) : null}
                  {chapterMoral(chapter, lang) ? (
                    <p className="mt-3 line-clamp-2 border-l border-[var(--brass)]/40 pl-3 text-sm leading-snug text-[var(--brass-soft)]">
                      {chapterMoral(chapter, lang)}
                    </p>
                  ) : null}
                  <p className="mt-4 text-xs text-[var(--brass)]">
                    {chapter.verses_count} {t("verses")} →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
