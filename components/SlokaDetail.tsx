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
  formatWordMeaningsInline,
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
  const commentaryRaw =
    lang === "hi" ? sloka.hindi_meaning : sloka.english_meaning;
  const commentary = commentaryRaw ? cleanCommentary(commentaryRaw) : "";

  const chapterTitle =
    lang === "hi" ? chapterMeta?.name_sanskrit : chapterMeta?.name;

  return (
    <article className="animate-fade">
      {/* Shloka as the page heading */}
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

      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] py-3 text-sm">
        {prev ? (
          <Link
            href={`/sloka/${prev.id}`}
            className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            ← {formatVerseRef(prev)}
          </Link>
        ) : (
          <span className="text-[var(--text-muted)]/40">{t("start")}</span>
        )}
        {next ? (
          <Link
            href={`/sloka/${next.id}`}
            className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {formatVerseRef(next)} →
          </Link>
        ) : (
          <span className="text-[var(--text-muted)]/40">{t("end")}</span>
        )}
      </nav>

      {/* Two balanced columns */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-0 lg:items-stretch">
        {/* Verse details */}
        <section className="min-w-0 space-y-7 border border-[var(--line)] bg-[rgba(14,20,32,0.35)] p-5 sm:p-7 lg:rounded-none lg:border-r-0">
          {passage && passage.verses.length > 1 && (
            <div>
              <h2 className="mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
                {t("passage")} {passage.label}
              </h2>
              <p className="mb-4 text-sm text-[var(--text-muted)]">
                {t("passageHint")}
              </p>
              <ul className="space-y-3">
                {passage.verses.map((v) => {
                  const isFocus = v.id === sloka.id;
                  const line =
                    lang === "hi" ? v.hindi_translation : v.english_translation;
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
            </div>
          )}

          {passage && passage.verses.length > 1 && (
            <div className="h-px bg-[var(--line)]" />
          )}

          {wordEntries.length > 0 && (
            <div>
              <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {t("wordMeanings")}
              </h2>
              <p className="text-[15px] font-light leading-[1.85] text-[var(--text-muted)]">
                {formatWordMeaningsInline(wordEntries)}
              </p>
            </div>
          )}

          <div className="h-px bg-[var(--line)]" />

          <div>
            <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
              {t("translation")}
            </h2>
            <p className="text-lg leading-relaxed text-[var(--text)]">
              {translation}
            </p>
          </div>

          {commentary ? (
            <>
              <div className="h-px bg-[var(--line)]" />
              <div>
                <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
                  {t("meaning")}
                </h2>
                <div className="space-y-4 text-[15px] font-light leading-[1.8] text-[var(--text-muted)]">
                  {commentary.split(/\n\n+/).map((para, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {para.trim()}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-xs tracking-[0.12em] text-[var(--text-muted)]/70">
                  {lang === "hi"
                    ? t("commentarySourceHi")
                    : t("commentarySourceEn")}
                </p>
              </div>
            </>
          ) : null}

          {sloka.tags.length > 0 && (
            <>
              <div className="h-px bg-[var(--line)]" />
              <div>
                <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {t("themes")}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {sloka.tags.map((tag) => (
                    <li
                      key={tag}
                      className="border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
                    >
                      {tag.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>

        {/* Story — equal column, sticky on desktop */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="h-full border border-[var(--line)] lg:border-l-[var(--brass)]/35">
            <VerseStory
              slokaId={sloka.id}
              passageLabel={passage?.label}
            />
          </div>
        </aside>
      </div>
    </article>
  );
}
