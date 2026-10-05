"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import CompleteVerseButton from "@/components/CompleteVerseButton";
import FavoriteButton from "@/components/FavoriteButton";
import JournalBox from "@/components/JournalBox";
import VerseReflections from "@/components/VerseReflections";
import ShareButton from "@/components/ShareButton";
import SpeakButton from "@/components/SpeakButton";
import VerseStory from "@/components/VerseStory";
import { useLanguage } from "@/components/LanguageProvider";
import { useProgress } from "@/components/ProgressProvider";
import type { ChapterMeta } from "@/lib/chapters";
import type { VerseCredits } from "@/lib/commentary-sources";
import type { Sloka } from "@/lib/types";
import { formatVerseRef, truncatePreview } from "@/lib/sloka-utils";
import type {
  MoodLink,
  RelatedVersePreview,
  TeachingPassage,
} from "@/lib/sloka-utils";
import {
  cleanCommentary,
  hasCommentary,
  splitVerseLines,
} from "@/lib/verseDisplay";

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

export default function SlokaDetail({
  sloka,
  chapterMeta,
  prev = null,
  next = null,
  passage = null,
  related = [],
  popularName,
  credits,
  moodLinks = [],
  headingLevel = "h1",
}: Props) {
  const { lang, t } = useLanguage();
  const { recordOpen, markManyComplete, isComplete } = useProgress();

  useEffect(() => {
    void recordOpen(sloka.id, sloka.chapter);
  }, [sloka.id, sloka.chapter, recordOpen]);

  const sanskritLines = splitVerseLines(sloka.sanskrit_devanagari);
  const iastLines = splitVerseLines(sloka.transliteration_iast);
  const wordEntries = sloka.word_meanings
    ? Object.entries(sloka.word_meanings)
    : [];

  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;
  // Both translations ship in the HTML. The language toggle is client state
  // and the server renders English, so the Hindi translation — complete for
  // all 701 verses — existed only inside the hydration payload, where search
  // engines do not read it.
  const otherTranslation =
    lang === "hi" ? sloka.english_translation : sloka.hindi_translation;
  const Heading = headingLevel;

  const preferredMeaning =
    lang === "hi" ? sloka.hindi_meaning : sloka.english_meaning;
  const commentaryCredit = credits
    ? lang === "hi"
      ? credits.hindiCommentary
      : credits.englishCommentary
    : lang === "hi"
      ? t("commentarySourceHi")
      : t("commentarySourceEn");
  const commentary = hasCommentary(preferredMeaning)
    ? cleanCommentary(preferredMeaning!)
    : "";
  const otherLangHasCommentary = hasCommentary(
    lang === "hi" ? sloka.english_meaning : sloka.hindi_meaning
  );

  const chapterTitle =
    lang === "hi" ? chapterMeta?.name_sanskrit : chapterMeta?.name;
  const verseCount = chapterMeta?.verses_count;
  const unitIds = passage?.verses.map((v) => v.id) ?? [];
  const unitAllDone =
    unitIds.length > 0 && unitIds.every((id) => isComplete(id));

  const progressLabel = verseCount
    ? t("verseOfChapter")
        .replace("{n}", String(sloka.verse_number))
        .replace("{total}", String(verseCount))
    : null;

  return (
    <article className="animate-fade">
      <header className="border-b border-[var(--hairline)] pb-8 text-center">
        {/* Visible breadcrumb, matching the BreadcrumbList in the page's
            JSON-LD. The verse ref moved into the H1 below. */}
        <nav
          aria-label={t("breadcrumbLabel")}
          className="eyebrow font-body text-[var(--brass-soft)]"
        >
          <ol className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
            <li>
              <Link href="/explore" className="transition hover:text-[var(--brass)]">
                {/* Devanagari inside a tracked Latin eyebrow: the globals.css
                    guard only fires under html[lang="hi"], so an EN reader
                    was getting 0.22em pulled through "भगवद्गीता" — matras off
                    their base consonants, exactly what DESIGN.md forbids. */}
                <span className="font-devanagari tracking-normal">
                  {lang === "hi" ? "भगवद्गीता" : "Bhagavad Gita"}
                </span>
              </Link>
            </li>
            <li aria-hidden className="opacity-40">·</li>
            <li>
              <Link
                href={`/explore/${sloka.chapter}`}
                className="transition hover:text-[var(--brass)]"
              >
                {t("chapter")} {sloka.chapter}
                {chapterTitle ? ` · ${chapterTitle}` : ""}
              </Link>
            </li>
            {progressLabel ? (
              <>
                <li aria-hidden className="opacity-40">·</li>
                <li>{progressLabel}</li>
              </>
            ) : null}
          </ol>
        </nav>

        <div className="relative mx-auto mt-6 max-w-3xl">
          {prev ? (
            <Link
              href={`/sloka/${prev.id}`}
              className="absolute -left-2 top-1/2 hidden -translate-x-full -translate-y-1/2 items-center gap-1.5 pr-6 text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] xl:inline-flex"
              aria-label={formatVerseRef(prev)}
            >
              <span aria-hidden>←</span>
              {formatVerseRef(prev)}
            </Link>
          ) : null}
          {next ? (
            <Link
              href={`/sloka/${next.id}`}
              className="absolute -right-2 top-1/2 hidden translate-x-full -translate-y-1/2 items-center gap-1.5 pl-6 text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] xl:inline-flex"
              aria-label={formatVerseRef(next)}
            >
              {formatVerseRef(next)}
              <span aria-hidden>→</span>
            </Link>
          ) : null}

          {/* No `tracking-*` here: the html[lang="hi"] reset in globals.css only
              matches bracketed Tailwind values, so a bare `tracking-wide` slipped
              past it and tracked the verse in both languages. */}
          {/* The H1 names the verse the way it is searched ("Bhagavad Gita
              2.47 · Karmanye Vadhikaraste") above the Devanagari it used to
              consist of alone, which gave English queries nothing to match
              in the page's main heading. */}
          <Heading className="font-devanagari text-[1.65rem] font-semibold leading-[1.75] text-[var(--text)] sm:text-[2rem] md:text-[2.15rem]">
            <span className="mb-3 block font-body text-sm font-medium leading-normal text-[var(--brass-soft)] sm:text-base">
              {lang === "hi" ? (
                <span className="font-devanagari">भगवद्गीता</span>
              ) : (
                "Bhagavad Gita"
              )}{" "}
              {formatVerseRef(sloka)}
              {popularName ? ` · ${popularName}` : ""}
            </span>
            <span lang="sa" className="block space-y-3">
              {sanskritLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                  {i < sanskritLines.length - 1 ? "।" : " ॥"}
                </span>
              ))}
            </span>
          </Heading>
        </div>

        <div className="mx-auto mt-5 max-w-2xl space-y-1 text-base italic font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
          {iastLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <div className="mt-7 flex flex-col items-center gap-2">
          <SpeakButton
            text={sloka.sanskrit_devanagari}
            lang={lang === "hi" ? "hi" : "en"}
            chapter={sloka.chapter}
            verseNumber={sloka.verse_number}
            recitationOnly
            listenLabel={t("verseListen")}
            stopLabel={t("verseStop")}
            unsupportedLabel={t("ttsUnsupported")}
            className="inline-flex !h-10 !min-h-0 items-center justify-center gap-2 !border-[var(--brass)]/50 !bg-transparent !px-5 !py-0 !text-sm !leading-none !text-[var(--brass-soft)] hover:!border-[var(--brass)] hover:!bg-[var(--brass)]/10 hover:!text-[var(--text)] aria-pressed:!border-[var(--brass)] aria-pressed:!bg-[var(--brass)]/15 aria-pressed:!text-[var(--brass-soft)]"
          />
          <p className="text-[11px] tracking-[0.14em] text-[var(--text-muted)]">
            {t("verseRecitationCredit")}
          </p>
        </div>

        <nav
          className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm"
          aria-label={t("verseTools")}
        >
          <CompleteVerseButton slokaId={sloka.id} quiet />
          <span className="select-none text-[var(--text-muted)]/35" aria-hidden>
            ·
          </span>
          <FavoriteButton slokaId={sloka.id} quiet />
          <span className="select-none text-[var(--text-muted)]/35" aria-hidden>
            ·
          </span>
          <ShareButton
            title={`MindKshetra ${formatVerseRef(sloka)}`}
            text={translation}
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/sloka/${sloka.id}`}
            imageUrl={`/api/og/verse/${sloka.id}`}
            slokaId={sloka.id}
            surface="verse"
            shareLabel={t("verseShare")}
            imageLabel={t("verseShareImage")}
            quiet
          />
        </nav>

        <div className="mt-6 flex items-center justify-between text-sm lg:hidden">
          {prev ? (
            <Link
              href={`/sloka/${prev.id}`}
              className="inline-flex min-h-10 items-center gap-1.5 text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
            >
              <span aria-hidden>←</span>
              {formatVerseRef(prev)}
            </Link>
          ) : (
            <span className="text-[var(--text-muted)]/35">{t("start")}</span>
          )}
          {next ? (
            <Link
              href={`/sloka/${next.id}`}
              className="inline-flex min-h-10 items-center gap-1.5 text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
            >
              {formatVerseRef(next)}
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className="text-[var(--text-muted)]/35">{t("end")}</span>
          )}
        </div>

        <Image
          src="/ornaments/divider.svg"
          alt=""
          width={320}
          height={24}
          className="mx-auto mt-7 opacity-70"
        />
      </header>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <a
          href="#reflection"
          className="flex min-h-11 flex-1 items-center justify-center border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]/40 lg:hidden"
        >
          {t("readReflection")}
        </a>
        <Link
          // A tool action, not a document: one prompt URL per verse would
          // otherwise be 701 crawlable copies of the same chat shell.
          rel="nofollow"
          href={`/madhav?prompt=${encodeURIComponent(
            lang === "hi"
              ? `श्लोक ${formatVerseRef(sloka)} के बारे में मुझे समझाइए — आज मेरे जीवन में इसका क्या अर्थ हो सकता है?`
              : `Help me understand verse ${formatVerseRef(sloka)} — what might it mean for my life right now?`
          )}`}
          className="flex min-h-11 flex-1 items-center justify-center border border-[var(--brass)]/40 px-4 py-2.5 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)] hover:bg-[var(--brass)]/10 hover:text-[var(--text)]"
        >
          {t("askMadhavVerse")}
        </Link>
      </div>

      {passage ? (
        <p className="mt-4 border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs tracking-[0.06em] text-[var(--brass-soft)]">
          <span className="font-medium text-[var(--text)]">
            {lang === "hi" ? passage.titleHi : passage.titleEn}
          </span>
          <span className="text-[var(--text-muted)]"> · {passage.label}</span>
          <span className="text-[var(--text-muted)]">
            {" "}
            ·{" "}
            {passage.mode === "scene"
              ? t("unitBadgeScene")
              : t("unitBadgeTeaching")}
          </span>
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-0">
        <section className="min-w-0 space-y-7 border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-7 lg:rounded-none lg:border-r-0">
          {/* Primary reading: translation first */}
          <div>
            <h2 className="eyebrow mb-3 text-[var(--brass-soft)]">
              {t("translation")}
            </h2>
            <p className="font-display text-xl leading-relaxed text-[var(--text)] sm:text-[1.35rem]">
              {translation}
            </p>
            {otherTranslation ? (
              <div className="mt-5">
                <h3 className="eyebrow mb-2 text-[var(--text-muted)]">
                  {t("otherTranslation")}
                </h3>
                <p
                  lang={lang === "hi" ? "en" : "hi"}
                  className={`text-[15px] font-light leading-relaxed text-[var(--text-soft)] ${
                    lang === "hi" ? "" : "font-devanagari"
                  }`}
                >
                  {otherTranslation}
                </p>
              </div>
            ) : null}
          </div>

          <div className="h-px bg-[var(--line)]" />

          <div>
            <h2 className="eyebrow mb-3 text-[var(--brass-soft)]">
              {t("meaning")}
            </h2>
            {commentary ? (
              <>
                <div className="space-y-4 text-[15px] font-light leading-[1.8] text-[var(--text-muted)]">
                  {commentary.split(/\n\n+/).map((para, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {para.trim()}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-xs tracking-[0.12em] text-[var(--text-muted)]/70">
                  {commentaryCredit}
                </p>
              </>
            ) : (
              <div className="space-y-2 text-sm font-light text-[var(--text-muted)]/80">
                <p>{t("commentaryUnavailable")}</p>
                {otherLangHasCommentary ? (
                  <p className="text-xs tracking-[0.04em] text-[var(--text-muted)]/70">
                    {lang === "en"
                      ? t("commentaryTryHi")
                      : t("commentaryTryEn")}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Secondary study material */}
          {passage && passage.verses.length > 0 && (
            <>
              <div className="h-px bg-[var(--line)]" />
              <details className="group" open={passage.verses.length > 1}>
                <summary className="eyebrow cursor-pointer list-none text-[var(--brass-soft)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    {lang === "hi" ? passage.titleHi : passage.titleEn}
                    <span className="text-[var(--text-muted)]">
                      · {passage.label}
                    </span>
                    <span className="text-[var(--text-muted)] transition group-open:rotate-90">
                      →
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {t("passageHint")}
                </p>
                {unitIds.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      void markManyComplete(unitIds, !unitAllDone)
                    }
                    className="mt-3 text-xs text-[var(--brass-soft)] transition hover:text-[var(--brass)]"
                  >
                    {unitAllDone
                      ? t("markIncomplete")
                      : t("markUnitComplete")}
                  </button>
                ) : null}
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
                              {truncatePreview(line)}
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
                            {/* Previews, not full translations: printing every
                                verse of the unit on every verse page made
                                neighbouring pages 70–88% identical. */}
                            <span className="mt-1 block text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
                              {truncatePreview(line)}
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
              <details className="group">
                <summary className="eyebrow cursor-pointer list-none text-[var(--text-muted)] marker:content-none [&::-webkit-details-marker]:hidden">
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

          {moodLinks.length > 0 && (
            <>
              <div className="h-px bg-[var(--line)]" />
              <div>
                <h2 className="eyebrow mb-3 text-[var(--text-muted)]">
                  {t("verseMoodLinks")}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {moodLinks.map((mood) => (
                    <li key={mood.id}>
                      <Link
                        href={`/mood/${mood.id}`}
                        className="inline-block border border-[var(--brass)]/35 px-2.5 py-1 text-xs text-[var(--brass-soft)] transition hover:border-[var(--brass)] hover:text-[var(--text)]"
                      >
                        {lang === "hi" ? mood.labelHi : mood.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {sloka.tags.length > 0 && (
            <>
              <div className="h-px bg-[var(--line)]" />
              <div>
                <h2 className="eyebrow mb-3 text-[var(--text-muted)]">
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
            <VerseStory
              slokaId={sloka.id}
              passageLabel={passage?.label}
              initialMode={passage?.mode}
              initialTitleEn={passage?.titleEn}
              initialTitleHi={passage?.titleHi}
            />
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-6 border-t border-[var(--line)] pt-6">
          <h2 className="eyebrow text-[var(--brass-soft)]">
            {t("relatedVerses")}
          </h2>
          {/* Hairline list, not cards — the citation-list idiom. */}
          <ul className="mt-3">
            {related.map((r) => (
              <li key={r.id} className="border-t border-[var(--hairline)]">
                <Link
                  href={`/sloka/${r.id}`}
                  className="group flex min-h-11 flex-wrap items-baseline gap-x-4 gap-y-0.5 py-3"
                >
                  <span className="font-display text-sm text-[var(--brass-soft)] transition group-hover:text-[var(--brass)]">
                    {r.chapter}.{r.verse_number}
                  </span>
                  <span className="min-w-0 flex-1 basis-56 text-sm font-light leading-relaxed text-[var(--text-muted)] transition group-hover:text-[var(--text-soft)]">
                    {lang === "hi" ? r.previewHi : r.previewEn}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <JournalBox slokaId={sloka.id} />
      <VerseReflections slokaId={sloka.id} />
    </article>
  );
}
