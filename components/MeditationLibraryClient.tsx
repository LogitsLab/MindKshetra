"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { sleepTracks } from "@/lib/meditation-audio";
import { nextSleepEvening, readSleepEvenings } from "@/lib/meditation-stats";

export default function MeditationLibraryClient() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [night, setNight] = useState(1);

  useEffect(() => {
    if (!user) {
      setNight(nextSleepEvening(readSleepEvenings()));
      return;
    }
    void fetch("/api/meditation/progress?program=sleep-7")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { currentDay?: number } | null) => {
        if (data?.currentDay) setNight(data.currentDay);
      })
      .catch(() => undefined);
  }, [user]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-4xl">{t("medSleepShelf")}</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        <Link href={`/meditation/sleep/${night}`} className="text-[var(--brass-soft)]">
          {t("medSevenEvenings")}
        </Link>
      </p>
      <ul className="mt-6 space-y-3">
        {sleepTracks().map((track) => (
          <li key={track.id}>
            <Link href={`/meditation/library/${track.id}`} className="text-[var(--text)]">
              {lang === "hi" ? track.title_hi : track.title_en}
              <span className="ml-2 text-sm text-[var(--text-muted)]">
                {Math.round(track.durationSec / 60)} min
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
