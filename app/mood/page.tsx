"use client";

import MoodGrid from "@/components/MoodGrid";
import { useLanguage } from "@/components/LanguageProvider";
import { moods } from "@/lib/moods-data";

export default function MoodPage() {
  const { t } = useLanguage();

  return (
    <div className="animate-fade">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {t("moodEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--text)] sm:text-5xl">
          {t("moodTitle")}
        </h1>
        <p className="mt-3 text-[var(--text-muted)]">{t("moodIntro")}</p>
      </header>
      <div className="mt-10">
        <MoodGrid moods={moods} />
      </div>
    </div>
  );
}
