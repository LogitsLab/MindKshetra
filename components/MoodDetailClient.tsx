"use client";

import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import SlokaCard from "@/components/SlokaCard";
import { useLanguage } from "@/components/LanguageProvider";
import { moodLabel } from "@/lib/mood-utils";
import { getMoodVisual } from "@/lib/moodVisuals";
import type { Mood, Sloka } from "@/lib/types";

type Props = {
  mood: Mood;
  slokas: Sloka[];
  /** Search-facing H1 ("Bhagavad Gita verses for anxiety"), English UI only. */
  heading?: string;
  /** Matching seven-day path, e.g. "anxiety-7". */
  pathId?: string;
  /** Show the helplines link (moods where someone may be struggling). */
  showCare?: boolean;
};

export default function MoodDetailClient({
  mood,
  slokas,
  heading,
  pathId,
  showCare = false,
}: Props) {
  const { lang, t } = useLanguage();
  const label = moodLabel(mood, lang);
  const visual = getMoodVisual(mood);
  const prompt =
    lang === "hi"
      ? `मुझे ${label} महसूस हो रहा है। गीता की कौन सी शिक्षा मदद कर सकती है?`
      : `I'm feeling ${mood.label.toLowerCase()}. What teaching from the Gita can help me?`;

  return (
    <div className="animate-fade">
      <Link
        href="/mood"
        className="text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
      >
        {t("allMoods")}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span
              className="inline-block h-10 w-10"
              style={{
                backgroundColor: visual.accent,
                WebkitMaskImage: `url(${visual.icon})`,
                maskImage: `url(${visual.icon})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
              aria-hidden
            />
          </div>
          {/* The label stays as the eyebrow; the H1 says what the page is, in
              the words people search with. */}
          {heading && lang !== "hi" ? (
            <p className="eyebrow text-[var(--brass-soft)]">{label}</p>
          ) : null}
          <h1 className="font-display text-4xl font-semibold text-[var(--text)] sm:text-5xl">
            {heading && lang !== "hi" ? heading : label}
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">
            {slokas.length > 0
              ? `${slokas.length} ${
                  slokas.length === 1 ? t("matchedVerse") : t("matchedVerses")
                }`
              : t("noMoodMatch")}
          </p>
        </div>
        <Link
          rel="nofollow"
          href={`/madhav?prompt=${encodeURIComponent(prompt)}`}
          className="bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
        >
          {t("askMadhavAbout")}
        </Link>
      </div>

      {pathId || showCare ? (
        <div className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          {pathId ? (
            <Link
              href={`/paths/${pathId}`}
              className="text-[var(--brass-soft)] underline-offset-4 hover:underline"
            >
              {t("moodPathCta")} →
            </Link>
          ) : null}
          {showCare ? (
            <Link
              href="/care"
              className="text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
            >
              {t("moodCareCta")} →
            </Link>
          ) : null}
        </div>
      ) : null}

      {slokas.length > 0 ? (
        <div className="mt-8 grid gap-3">
          {slokas.map((sloka) => (
            <SlokaCard key={sloka.id} sloka={sloka} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={t("noMoodMatch")}
            body={`${t("tryAnotherMood")} ${t("askMadhavLink")}.`}
          />
          <p className="mt-3 text-center text-sm">
            <Link href="/madhav" className="text-[var(--brass-soft)]">
              {t("askMadhavLink")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
