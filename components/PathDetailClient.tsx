"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { PracticePath } from "@/lib/paths";
import {
  readGuestPathDays as readGuest,
  writeGuestPathDays as writeGuest,
} from "@/lib/paths-local";

type DayVerse = {
  day: number;
  slokaId: number | null;
};

type RunState = {
  currentDay: number;
  completedDays: number[];
  guest: boolean;
};

export default function PathDetailClient({
  path,
  dayVerses,
}: {
  path: PracticePath;
  dayVerses: DayVerse[];
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [run, setRun] = useState<RunState | null>(null);
  const [busyDay, setBusyDay] = useState<number | null>(null);

  const loadRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/paths/${path.id}/run`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        currentDay?: number;
        completedDays?: number[];
        guest?: boolean;
      };
      if (data.guest) {
        const completedDays = readGuest(path.id);
        setRun({
          currentDay: Math.min(
            path.days_count,
            (completedDays[completedDays.length - 1] ?? 0) + 1
          ),
          completedDays,
          guest: true,
        });
        return;
      }
      setRun({
        currentDay: data.currentDay ?? 1,
        completedDays: data.completedDays ?? [],
        guest: false,
      });
    } catch {
      const completedDays = readGuest(path.id);
      setRun({
        currentDay: Math.min(
          path.days_count,
          (completedDays[completedDays.length - 1] ?? 0) + 1
        ),
        completedDays,
        guest: true,
      });
    }
  }, [path.days_count, path.id]);

  useEffect(() => {
    void loadRun();
  }, [loadRun, user]);

  async function markDay(day: number) {
    setBusyDay(day);
    if (!user || run?.guest) {
      const next = Array.from(
        new Set([...(run?.completedDays ?? []), day])
      ).sort((a, b) => a - b);
      writeGuest(path.id, next);
      setRun({
        currentDay: Math.min(path.days_count, day + 1),
        completedDays: next,
        guest: true,
      });
      setBusyDay(null);
      return;
    }

    try {
      const res = await fetch(`/api/paths/${path.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        currentDay?: number;
        completedDays?: number[];
      };
      setRun({
        currentDay: data.currentDay ?? day + 1,
        completedDays: data.completedDays ?? [],
        guest: false,
      });
    } catch {
      /* keep prior state */
    } finally {
      setBusyDay(null);
    }
  }

  const verseByDay = new Map(dayVerses.map((d) => [d.day, d.slokaId]));
  const completed = new Set(run?.completedDays ?? []);

  return (
    <div className="max-w-2xl">
      <p className="mb-8">
        <Link
          href="/paths"
          className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          ← {t("pathBack")}
        </Link>
      </p>

      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {t("pathListEyebrow")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          {lang === "hi" ? path.title_hi : path.title_en}
        </h1>
        <p className="mt-3 text-[var(--text-muted)]">
          {lang === "hi" ? path.intro_hi : path.intro_en}
        </p>
        {!user ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("pathSignInProgress")}{" "}
            <Link
              href="/account"
              className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        ) : null}
      </header>

      <ol className="space-y-6">
        {path.days.map((day) => {
          const done = completed.has(day.day);
          const slokaId = verseByDay.get(day.day) ?? null;
          const practiceHref =
            slokaId != null
              ? `/sadhana?slokaId=${slokaId}&pathId=${encodeURIComponent(path.id)}&pathDay=${day.day}&pathTotal=${path.days_count}&minutes=${day.minutes}`
              : null;
          return (
            <li
              key={day.day}
              className="border border-[var(--line)] px-5 py-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
                {t("pathDay").replace("{n}", String(day.day))}
              </p>
              <h2 className="mt-2 font-display text-xl text-[var(--text)]">
                {lang === "hi" ? day.title_hi : day.title_en}
              </h2>
              <p className="mt-2 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
                {lang === "hi" ? day.prompt_hi : day.prompt_en}
              </p>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {t("pathDayPractice")}:{" "}
                {t(`pathPractice_${day.practice}` as "pathPractice_sit")} ·{" "}
                {day.minutes} {t("pathDayMinutes")} · {day.ref.chapter}.
                {day.ref.verse}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {practiceHref ? (
                  <Link
                    href={practiceHref}
                    className="min-h-10 bg-[var(--brass)] px-4 py-2 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
                  >
                    {t("pathBeginPractice")}
                  </Link>
                ) : null}
                {slokaId ? (
                  <Link
                    href={`/sloka/${slokaId}`}
                    className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
                  >
                    {t("pathOpenVerse")}
                  </Link>
                ) : null}
                {done ? (
                  <span className="text-sm text-[var(--brass-soft)]">
                    {t("pathMarked")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyDay === day.day}
                    onClick={() => void markDay(day.day)}
                    className="min-h-10 border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)] disabled:opacity-50"
                  >
                    {t("pathMarkDone")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
