"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { moodLabel } from "@/lib/mood-utils";
import { getMoodVisual } from "@/lib/moodVisuals";
import type { Mood } from "@/lib/types";

type Props = {
  moods: Mood[];
};

export default function MoodGrid({ moods }: Props) {
  const { lang } = useLanguage();

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {moods.map((mood, i) => {
        const visual = getMoodVisual(mood);
        return (
          <Link
            key={mood.id}
            href={`/mood/${mood.id}`}
            className="surface group relative flex min-h-[112px] flex-col justify-between overflow-hidden px-5 py-5"
          >
            <span
              className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(ellipse 80% 70% at 90% 10%, color-mix(in srgb, ${visual.accent} 22%, transparent), transparent 60%)`,
              }}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <span className="text-[10px] tracking-[0.2em] text-[var(--brass)]/80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="mood-glyph inline-block h-9 w-9 opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
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
            <span className="relative mt-3 block font-display text-xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)] sm:text-2xl">
              {moodLabel(mood, lang)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
