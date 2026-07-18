"use client";

import Image from "next/image";
import Link from "next/link";
import VerseStory from "@/components/VerseStory";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChapterMeta } from "@/lib/chapters";
import type { Sloka } from "@/lib/types";
import {
  formatVerseRef,
  getAdjacentSlokas,
  getTeachingPassage,
} from "@/lib/slokas";
import {
  cleanCommentary,
  hasCommentary,
  splitVerseLines,
} from "@/lib/verseDisplay";

type Props = {
  sloka: Sloka;
  chapterMeta?: ChapterMeta;
};

export default function SlokaDetail({ sloka, chapterMeta }: Props) {
  const { lang, t } = useLanguage();
  const { prev, next } = getAdjacentSlokas(sloka.id);
  const passage = getTeachingPassage(sloka.id);

  const sanskritLines = splitVerseLines(sloka.sanskrit_devanagari);
  const iastLines = splitVerseLines(sloka.transliteration_iast);
  const wordEntries = sloka.word_meanings
    ? Object.entries(sloka.word_meanings)
    : [];

  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;

  const preferredMeaning =
    lang === "hi" ? sloka.hindi_meaning : sloka.english_meaning;
  const fallbackMeaning =
    lang === "hi" ? sloka.english_meaning : sloka.hindi_meaning;
  const usingFallback =
    !hasCommentary(preferredMeaning) && hasCommentary(fallbackMeaning);
  const commentarySource = usingFallback ? fallbackMeaning : preferredMeaning;
  const commentary = hasCommentary(commentarySource)
    ? cleanCommentary(commentarySource!)
    : "";

  const chapterTitle =
    lang === "hi" ? chapterMeta?.name_sanskrit : chapterMeta?.name;
  const verseCount = chapterMeta?.verses_count;

  return (
    <article className="animate-fade">
      <header className="border-b border-white/[0.06] pb-8 text-center">
        <p className="font-body text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {lang === "hi" ? "भगवद्गीता" : "Bhagavad Gita"} ·{" "}
          {formatVerseRef(sloka)}
          {chapterTitle ? ` · ${chapterTitle}` : ""}
        </p>

        <h1 className="mx-auto mt-6 max-w-3xl space-y-3 font-display text-[1.65rem] font-semibold leading-[1.75] tracking-wide text-[var(--text)] sm:text-[2rem] md:text-[2.15rem]">
          {sanskritLines.map((line, i) => (
            <span key={i} className="block">
              {line}
              {i < sanskritLines.length - 1 ? "।" : " ॥"}
            </span>
          ))}
        </h1>

        <div className="mx-auto mt-5 max-w-2xl space-y-1 text-base italic font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
          {iastLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <Image
          src="/ornaments/divider.svg"
          alt=""
          width={320}
          height={24}
          className="mx-auto mt-6 opacity-70"
        />
      </header>

      <nav className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] py-2 text-sm sm:gap-3 sm:py-3">
        {prev ? (
          <Link
            href={`/sloka/${prev.id}`}
            className="inline-flex min-h-11 items-center px-1 text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            ← {formatVerseRef(prev)}
          </Link>
        ) : (
          <span className="text-[var(--text-muted)]/40">{t("start")}</span>
        )}

        {verseCount ? (
          <p className="order-last w-full text-center text-xs tracking-[0.14em] text-[var(--text-muted)] sm:order-none sm:w-auto">
            {t("verseProgress")} {sloka.verse_number} {t("ofChapter")}{" "}
            {verseCount}
          </p>
        ) : null}

        {next ? (
          <Link
            href={`/sloka/${next.id}`}
            className="inline-flex min-h-11 items-center px-1 text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {formatVerseRef(next)} →
          </Link>
        ) : (
          <span className="text-[var(--text-muted)]/40">{t("end")}</span>
        )}
      </nav>

      <a
        href="#reflection"
        className="mt-4 flex min-h-11 items-center justify-center border border-[var(--line)] bg-[rgba(14,20,32,0.45)] px-4 py-2.5 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]/40 lg:hidden"
      >
        {t("readReflection")}
      </a>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-0">
        <section className="min-w-0 space-y-7 border border-[var(--line)] bg-[rgba(14,20,32,0.35)] p-5 sm:p-7 lg:rounded-none lg:border-r-0">
          {/* Primary reading: translation first */}
          <div>
            <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
              {t("translation")}
            </h2>
            <p className="font-display text-xl leading-relaxed text-[var(--text)] sm:text-[1.35rem]">
              {translation}
            </p>
          </div>

          <div className="h-px bg-[var(--line)]" />

          <div>
            <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
              {t("meaning")}
            </h2>
            {commentary ? (
              <>
                {usingFallback ? (
                  <p className="mb-3 text-xs tracking-[0.08em] text-[var(--text-muted)]/80">
                    {t("commentaryFallbackNote")}
                  </p>
                ) : null}
                <div className="space-y-4 text-[15px] font-light leading-[1.8] text-[var(--text-muted)]">
                  {commentary.split(/\n\n+/).map((para, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {para.trim()}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-xs tracking-[0.12em] text-[var(--text-muted)]/70">
                  {usingFallback || lang === "hi"
                    ? t("commentarySourceHi")
                    : t("commentarySourceEn")}
                </p>
              </>
            ) : (
              <p className="text-sm font-light text-[var(--text-muted)]/80">
                {t("commentaryUnavailable")}
              </p>
            )}
          </div>

          {/* Secondary study material */}
          {passage && passage.verses.length > 1 && (
            <>
              <div className="h-px bg-[var(--line)]" />
              <details className="group">
                <summary className="cursor-pointer list-none text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    {t("passage")} {passage.label}
                    <span className="text-[var(--text-muted)] transition group-open:rotate-90">
                      →
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {t("passageHint")}
                </p>
                <ul className="mt-4 space-y-3">
                  {passage.verses.map((v) => {
                    const isFocus = v.id === sloka.id;
                    const line =
                      lang === "hi"
                        ? v.hindi_translation
                        : v.english_translation;
                    return (
                      <li key={v.id}>
                        {isFocus ? (
                          <p className="border-l-2 border-[var(--brass)] pl-3">
                            <span className="font-display text-sm text-[var(--brass)]">
                              {formatVerseRef(v)}
                            </span>
                            <span className="mt-1 block text-[15px] leading-relaxed text-[var(--text)]">
                              {line}
                            </span>
                          </p>
                        ) : (
                          <Link
                            href={`/sloka/${v.id}`}
                            className="block border-l-2 border-transparent pl-3 transition hover:border-[var(--brass)]/40"
                          >
                            <span className="font-display text-sm text-[var(--text-muted)]">
                              {formatVerseRef(v)}
                            </span>
                            <span className="mt-1 block text-[15px] font-light leading-relaxed text-[var(--text-muted)] line-clamp-3">
                              {line}
                            </span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            </>
          )}

          {wordEntries.length > 0 && (
            <>
              <div className="h-px bg-[var(--line)]" />
              <details className="group" open>
                <summary className="cursor-pointer list-none text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    {t("wordMeanings")}
                    <span className="text-[var(--text-muted)]/70 transition group-open:rotate-90">
                      →
                    </span>
                  </span>
                </summary>
                <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  {wordEntries.map(([word, meaning]) => (
                    <div
                      key={word}
                      className="border-l border-[var(--line)] pl-3"
                    >
                      <dt className="font-display text-sm text-[var(--brass-soft)]">
                        {word}
                      </dt>
                      <dd className="mt-0.5 text-sm font-light leading-snug text-[var(--text-muted)]">
                        {meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            </>
          )}

          {sloka.tags.length > 0 && (
            <>
              <div className="h-px bg-[var(--line)]" />
              <div>
                <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {t("themes")}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {sloka.tags.map((tag) => {
                    const label = tag.replace(/_/g, " ");
                    return (
                      <li key={tag}>
                        <Link
                          href={`/explore?q=${encodeURIComponent(label)}`}
                          className="inline-block border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </section>

        <aside
          id="reflection"
          className="min-w-0 scroll-mt-24 lg:sticky lg:top-24 lg:self-start"
        >
          <div className="h-full border border-[var(--line)] lg:border-l-[var(--brass)]/35">
            <VerseStory slokaId={sloka.id} passageLabel={passage?.label} />
          </div>
        </aside>
      </div>
    </article>
  );
}
