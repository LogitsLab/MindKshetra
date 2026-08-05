"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { isDayUnlocked, type Journey } from "@/lib/journeys/core";
import { pathCover } from "@/lib/paths/cover";
import {
  readGuestJourneyDays as readGuest,
  writeGuestJourneyDays as writeGuest,
} from "@/lib/journeys/local";

type DayVerse = {
  day: number;
  slokaId: number | null;
};

type RunState = {
  currentDay: number;
  completedDays: number[];
  guest: boolean;
};

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    template
  );
}

function nearbyDays<T extends { day: number }>(
  days: T[],
  continueDay: number,
  windowSize = 7
): T[] {
  if (!days.length) return [];
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, continueDay - half);
  let end = start + windowSize - 1;
  if (end > days.length) {
    end = days.length;
    start = Math.max(1, end - windowSize + 1);
  }
  return days.filter((d) => d.day >= start && d.day <= end);
}

export default function PathDetailClient({
  path,
  dayVerses,
}: {
  path: Journey;
  dayVerses: DayVerse[];
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [run, setRun] = useState<RunState | null>(null);
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const loadRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/journeys/${path.id}/run`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        currentDay?: number;
        completedDays?: number[];
        guest?: boolean;
      };
      if (data.guest) {
        const completedDays = readGuest(path.id, path.days_count);
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
      const completedDays = readGuest(path.id, path.days_count);
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
      const res = await fetch(`/api/journeys/${path.id}/run`, {
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

  const verseByDay = useMemo(
    () => new Map(dayVerses.map((d) => [d.day, d.slokaId])),
    [dayVerses]
  );
  const completed = new Set(run?.completedDays ?? []);
  const doneCount = completed.size;
  const continueDay =
    doneCount >= path.days_count
      ? path.days_count
      : Math.min(path.days_count, Math.max(1, run?.currentDay ?? 1));
  const pathPct = Math.round((doneCount / path.days_count) * 100);
  const continueMeta = path.days.find((d) => d.day === continueDay);
  const windowDays = nearbyDays(path.days, continueDay, 7);
  const visibleDays = showAll ? path.days : windowDays;
  const selected =
    path.days.find((d) => d.day === (activeDay ?? continueDay)) ??
    continueMeta;

  const selectedUnlocked = selected
    ? isDayUnlocked(
        selected.day,
        run?.completedDays ?? [],
        path.days_count,
        path.unlock
      )
    : false;
  const selectedDone = selected ? completed.has(selected.day) : false;
  const selectedSloka = selected
    ? (verseByDay.get(selected.day) ?? null)
    : null;
  const practiceHref =
    selected && selectedSloka != null
      ? `/sadhana?slokaId=${selectedSloka}&pathId=${encodeURIComponent(path.id)}&pathDay=${selected.day}&pathTotal=${path.days_count}&minutes=${selected.minutes}`
      : null;

  return (
    <div className="paths-hub pb-10">
      <section className="med-hub__hero relative mb-10 overflow-hidden border border-[var(--line)]">
        <Image
          src={pathCover(path.id)}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 80rem"
          className="object-cover object-center"
        />
        <div className="med-hub__hero-scrim absolute inset-0" aria-hidden />
        <div className="relative z-10 flex min-h-[22rem] flex-col justify-end px-6 py-8 sm:min-h-[26rem] sm:px-10 sm:py-10 lg:px-12">
          <Link
            href="/paths"
            className="mb-4 w-fit text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            ← {t("pathBack")}
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
            {t("pathListEyebrow")} · {path.days_count}{" "}
            {lang === "hi" ? "दिन" : "days"}
          </p>
          <h1 className="mt-3 max-w-xl font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-white">
            {lang === "hi" ? path.title_hi : path.title_en}
          </h1>
          <p className="mt-3 max-w-lg text-sm font-light leading-relaxed text-white/75 sm:text-base">
            {lang === "hi" ? path.intro_hi : path.intro_en}
          </p>

          {run ? (
            <div className="mt-6 max-w-md">
              <div className="mb-2 flex items-baseline justify-between gap-3 text-xs tracking-[0.12em] text-white/55">
                <span>
                  {fill(t("pathRunProgress"), {
                    n: continueDay,
                    total: path.days_count,
                  })}
                </span>
                <span>
                  {doneCount >= path.days_count
                    ? t("pathRunDone")
                    : doneCount === 0
                      ? t("pathNotStarted")
                      : t("pathInProgress")}
                </span>
              </div>
              <div className="paths-hub__bar" aria-hidden>
                <div
                  className="paths-hub__bar-fill"
                  style={{ width: `${pathPct}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-end gap-4">
            {practiceHref && selectedUnlocked ? (
              <Link
                href={practiceHref}
                className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {doneCount === 0
                  ? t("pathStart")
                  : fill(t("pathContinue"), { n: continueDay })}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setActiveDay(continueDay)}
                className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {doneCount === 0
                  ? t("pathStart")
                  : fill(t("pathContinue"), { n: continueDay })}
              </button>
            )}
            {continueMeta ? (
              <div className="min-w-0 max-w-sm">
                <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                  {fill(t("pathDay"), { n: continueDay })} ·{" "}
                  {continueMeta.minutes} {t("pathDayMinutes")}
                </p>
                <p className="mt-1 font-display text-lg text-white">
                  {lang === "hi"
                    ? continueMeta.title_hi
                    : continueMeta.title_en}
                </p>
              </div>
            ) : null}
          </div>

          {run?.guest || !user ? (
            <p className="mt-4 text-sm text-white/55">
              {t("pathSignInProgress")}{" "}
              <Link
                href="/account"
                className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
              >
                {t("signIn")}
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-[var(--brass)]">{t("pathNearYou")}</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
              {t("pathDaysTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            {showAll ? t("pathHideAllDays") : t("pathShowAllDays")}
          </button>
        </div>

        <div className="med-hub__days">
          {visibleDays.map((day) => {
            const done = completed.has(day.day);
            const unlocked = isDayUnlocked(
              day.day,
              run?.completedDays ?? [],
              path.days_count,
              path.unlock
            );
            const current = day.day === continueDay;
            const selectedDay = day.day === (activeDay ?? continueDay);
            const dayTitle = lang === "hi" ? day.title_hi : day.title_en;
            const className = `med-hub__day ${done ? "is-done" : ""} ${
              current || selectedDay ? "is-current" : ""
            } ${!unlocked ? "is-locked" : ""}`;

            if (!unlocked) {
              return (
                <div key={day.day} className={className} aria-disabled>
                  <p className="text-[11px] tracking-[0.16em] text-[var(--text-muted)]">
                    {fill(t("pathDay"), { n: day.day })}
                  </p>
                  <p className="mt-2 font-display text-lg text-[var(--text-muted)]">
                    {dayTitle}
                  </p>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    {t("pathDayLocked")}
                  </p>
                </div>
              );
            }

            return (
              <button
                key={day.day}
                type="button"
                onClick={() => setActiveDay(day.day)}
                className={`${className} text-left`}
              >
                <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                  {fill(t("pathDay"), { n: day.day })} · {day.minutes}{" "}
                  {t("pathDayMinutes")}
                </p>
                <p className="mt-2 font-display text-lg text-[var(--text)]">
                  {dayTitle}
                </p>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {done
                    ? t("pathMarked")
                    : current
                      ? t("pathDayAvailable")
                      : t("pathDayAvailable")}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <section className="border border-[var(--line)] px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brass-soft)]">
            {fill(t("pathDay"), { n: selected.day })}
          </p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
            {lang === "hi" ? selected.title_hi : selected.title_en}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
            {selected.kind === "scripture"
              ? lang === "hi"
                ? selected.prompt_hi
                : selected.prompt_en
              : lang === "hi"
                ? selected.session.theme_hi
                : selected.session.theme_en}
          </p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {t("pathDayPractice")}:{" "}
            {t(`pathPractice_${selected.practice}` as "pathPractice_sit")} ·{" "}
            {selected.minutes} {t("pathDayMinutes")}
            {selected.ref
              ? ` · ${selected.ref.chapter}.${selected.ref.verse}`
              : null}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {practiceHref && selectedUnlocked ? (
              <Link
                href={practiceHref}
                className="min-h-10 bg-[var(--brass)] px-4 py-2 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("pathBeginPractice")}
              </Link>
            ) : null}
            {selectedSloka ? (
              <Link
                href={`/sloka/${selectedSloka}`}
                className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
              >
                {t("pathOpenVerse")}
              </Link>
            ) : null}
            {selectedDone ? (
              <span className="text-sm text-[var(--brass-soft)]">
                {t("pathMarked")}
              </span>
            ) : !selectedUnlocked ? (
              <span className="text-sm text-[var(--text-muted)]">
                {t("pathDayLocked")}
              </span>
            ) : (
              <button
                type="button"
                disabled={busyDay === selected.day}
                onClick={() => void markDay(selected.day)}
                className="min-h-10 border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)] disabled:opacity-50"
              >
                {t("pathMarkDone")}
              </button>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
