"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import {
  FOUNDATION_PROGRAM_ID,
  isDayUnlocked,
  type MeditationProgram,
  type MeditationSession,
} from "@/lib/meditation-core";

type Progress = {
  currentDay: number;
  completedDays: number[];
  guest: boolean;
  streak: { current: number; longest: number } | null;
};

type Catalog = {
  program: MeditationProgram;
  dailies: { title_en: string; title_hi: string; intro_en: string; intro_hi: string; sessions: MeditationSession[] };
};

const GUEST_RUN_KEY = `mindkshetra-meditation-run-${FOUNDATION_PROGRAM_ID}`;

function readGuestRun(): number[] {
  try {
    const raw = localStorage.getItem(GUEST_RUN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completedDays?: unknown };
    if (!Array.isArray(parsed.completedDays)) return [];
    return parsed.completedDays.filter(
      (d): d is number => typeof d === "number" && Number.isInteger(d)
    );
  } catch {
    return [];
  }
}

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    template
  );
}

export default function MeditationHubClient({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const program = initialCatalog.program;
  const dailies = initialCatalog.dailies;

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/meditation/progress?program=${FOUNDATION_PROGRAM_ID}`
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Progress & { guest?: boolean };
      if (data.guest) {
        const completedDays = readGuestRun();
        setProgress({
          currentDay: Math.min(
            program.days_count,
            (completedDays[completedDays.length - 1] ?? 0) + 1
          ),
          completedDays,
          guest: true,
          streak: null,
        });
        return;
      }
      setProgress({
        currentDay: data.currentDay ?? 1,
        completedDays: data.completedDays ?? [],
        guest: false,
        streak: data.streak,
      });
    } catch {
      const completedDays = readGuestRun();
      setProgress({
        currentDay: Math.min(
          program.days_count,
          (completedDays[completedDays.length - 1] ?? 0) + 1
        ),
        completedDays,
        guest: true,
        streak: null,
      });
    }
  }, [program.days_count]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress, user]);

  // Merge guest completions on sign-in
  useEffect(() => {
    if (!user || user.is_anonymous) return;
    try {
      const raw = localStorage.getItem("mindkshetra-meditation-queue");
      if (!raw) return;
      const completions = JSON.parse(raw) as unknown[];
      if (!Array.isArray(completions) || completions.length === 0) return;
      fetch("/api/meditation/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completions }),
      })
        .then((res) => {
          if (res.ok) localStorage.removeItem("mindkshetra-meditation-queue");
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }, [user]);

  const completed = new Set(progress?.completedDays ?? []);
  const continueDay =
    progress?.completedDays.length === program.days_count
      ? program.days_count
      : Math.min(
          program.days_count,
          Math.max(1, progress?.currentDay ?? 1)
        );

  const title = lang === "hi" ? program.title_hi : program.title_en;
  const intro = lang === "hi" ? program.intro_hi : program.intro_en;

  return (
    <div className="max-w-2xl">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {t("medEyebrow")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-[var(--text-muted)]">{intro}</p>
        {progress ? (
          <p className="mt-4 text-sm text-[var(--brass-soft)]">
            {fill(t("medProgress"), {
              done: completed.size,
              total: program.days_count,
            })}
            {progress.streak && progress.streak.current > 0
              ? ` · ${fill(t("medStreak"), { n: progress.streak.current })}`
              : ` · ${t("medStreakNone")}`}
          </p>
        ) : null}
        {progress?.guest ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {t("medSignInHint")}{" "}
            <Link
              href="/account"
              className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        ) : null}
        <Link
          href={`/meditation/${continueDay}`}
          className="mt-6 inline-flex min-h-11 items-center bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
        >
          {completed.size === 0
            ? t("medStart")
            : fill(t("medContinue"), { n: continueDay })}
        </Link>
      </header>

      <ol className="space-y-3">
        {program.days.map((day) => {
          const done = completed.has(day.day_number);
          const unlocked = isDayUnlocked(
            day.day_number,
            progress?.completedDays ?? [],
            program.days_count
          );
          const dayTitle = lang === "hi" ? day.title_hi : day.title_en;
          return (
            <li key={day.id}>
              {unlocked ? (
                <Link
                  href={`/meditation/${day.day_number}`}
                  className="flex items-start justify-between gap-4 border border-[var(--line)] px-4 py-4 transition hover:border-[var(--brass)]/40"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
                      Day {day.day_number} · {day.duration_minutes} min
                    </p>
                    <p className="mt-1 font-display text-xl text-[var(--text)]">
                      {dayTitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-[var(--text-muted)]">
                    {done ? t("medDayComplete") : t("medDayAvailable")}
                  </span>
                </Link>
              ) : (
                <div className="flex items-start justify-between gap-4 border border-[var(--hairline)] px-4 py-4 opacity-60">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Day {day.day_number}
                    </p>
                    <p className="mt-1 font-display text-xl text-[var(--text-muted)]">
                      {dayTitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-[var(--text-muted)]">
                    {t("medDayLocked")}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <section className="mt-14 border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl text-[var(--text)]">
          {lang === "hi" ? dailies.title_hi : dailies.title_en}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {lang === "hi" ? dailies.intro_hi : dailies.intro_en}
        </p>
        <ul className="mt-6 space-y-3">
          {dailies.sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/meditation/daily/${s.id}`}
                className="block border border-[var(--line)] px-4 py-4 transition hover:border-[var(--brass)]/40"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
                  {s.duration_minutes} min
                </p>
                <p className="mt-1 font-display text-lg text-[var(--text)]">
                  {lang === "hi" ? s.title_hi : s.title_en}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-[var(--text-muted)]">
        <Link
          href="/support"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("medBridgeSupport")}
        </Link>
      </p>
    </div>
  );
}
