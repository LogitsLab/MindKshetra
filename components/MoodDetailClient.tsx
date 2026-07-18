"use client";

import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import SlokaCard from "@/components/SlokaCard";
import { useLanguage } from "@/components/LanguageProvider";
import { moodLabel } from "@/lib/moods";
import { getMoodVisual } from "@/lib/moodVisuals";
import type { Mood, Sloka } from "@/lib/types";

type Props = {
  mood: Mood;
  slokas: Sloka[];
};

export default function MoodDetailClient({ mood, slokas }: Props) {
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
          <h1 className="font-display text-4xl font-semibold text-[var(--text)] sm:text-5xl">
            {label}
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
          href={`/madhav?prompt=${encodeURIComponent(prompt)}`}
          className="bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--void)] transition hover:bg-[var(--brass-soft)]"
        >
          {t("askMadhavAbout")}
        </Link>
      </div>

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
