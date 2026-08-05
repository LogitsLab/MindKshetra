"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import {
  SITTING_COURSE_ID,
  isDayUnlocked,
  sittingSectionForDay,
  type MeditationProgram,
  type MeditationSession,
} from "@/lib/meditation-core";
import {
  readGuestJourneyDays,
  readAllGuestJourneys,
  clearGuestJourney,
} from "@/lib/journeys/local";

type Progress = {
  currentDay: number;
  completedDays: number[];
  guest: boolean;
  streak: { current: number; longest: number } | null;
};

type Catalog = {
  program: MeditationProgram;
  dailies: {
    title_en: string;
    title_hi: string;
    intro_en: string;
    intro_hi: string;
    sessions: MeditationSession[];
  };
};

const LEGACY_GUEST_KEY = "mindkshetra-meditation-run-foundation-7";
const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

function readGuestRun(daysCount: number): number[] {
  const fromJourney = readGuestJourneyDays(SITTING_COURSE_ID, daysCount);
  if (fromJourney.length) return fromJourney;
  try {
    const raw = localStorage.getItem(LEGACY_GUEST_KEY);
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

function sectionLabel(
  id: "foundation" | "habit" | "deepening",
  t: (k: "medSectionFoundation" | "medSectionHabit" | "medSectionDeepening") => string
) {
  if (id === "foundation") return t("medSectionFoundation");
  if (id === "habit") return t("medSectionHabit");
  return t("medSectionDeepening");
}

function nearbyDays(
  days: MeditationSession[],
  continueDay: number,
  windowSize = 7
): MeditationSession[] {
  if (!days.length) return [];
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, continueDay - half);
  let end = start + windowSize - 1;
  if (end > days.length) {
    end = days.length;
    start = Math.max(1, end - windowSize + 1);
  }
  return days.filter((d) => d.day_number >= start && d.day_number <= end);
}

export default function MeditationHubClient({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showAll, setShowAll] = useState(false);
  const program = initialCatalog.program;
  const dailies = initialCatalog.dailies;

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/meditation/progress?program=${SITTING_COURSE_ID}`
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Progress & { guest?: boolean };
      if (data.guest) {
        const completedDays = readGuestRun(program.days_count);
        setProgress({
          currentDay: Math.min(
            program.days_count,
            Math.max(
              1,
              (completedDays[completedDays.length - 1] ?? 0) + 1
            )
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
      const completedDays = readGuestRun(program.days_count);
      setProgress({
        currentDay: Math.min(
          program.days_count,
          Math.max(1, (completedDays[completedDays.length - 1] ?? 0) + 1)
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

  useEffect(() => {
    if (!user || user.is_anonymous) return;
    try {
      const raw = localStorage.getItem(GUEST_QUEUE_KEY);
      if (raw) {
        const completions = JSON.parse(raw) as unknown[];
        if (Array.isArray(completions) && completions.length) {
          fetch("/api/meditation/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completions }),
          })
            .then((res) => {
              if (res.ok) localStorage.removeItem(GUEST_QUEUE_KEY);
            })
            .catch(() => {});
        }
      }
      const journeys = readAllGuestJourneys().filter(
        (j) =>
          j.journeyId === SITTING_COURSE_ID ||
          j.journeyId === "foundation-7" ||
          j.journeyId === "meditation-21"
      );
      const legacy = readGuestRun(program.days_count);
      const payload = [...journeys];
      if (
        legacy.length &&
        !payload.some((j) => j.journeyId === SITTING_COURSE_ID)
      ) {
        payload.push({
          journeyId: SITTING_COURSE_ID,
          completedDays: legacy,
        });
      }
      if (payload.length) {
        fetch("/api/journeys/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ journeys: payload }),
        })
          .then((res) => {
            if (res.ok) {
              clearGuestJourney(SITTING_COURSE_ID);
              clearGuestJourney("foundation-7");
              localStorage.removeItem(LEGACY_GUEST_KEY);
              void loadProgress();
            }
          })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, [user, program.days_count, loadProgress]);

  const completed = new Set(progress?.completedDays ?? []);
  const continueDay =
    progress?.completedDays.length === program.days_count
      ? program.days_count
      : Math.min(
          program.days_count,
          Math.max(1, progress?.currentDay ?? 1)
        );

  const continueSession =
    program.days.find((d) => d.day_number === continueDay) ?? program.days[0];
  const continueTitle = continueSession
    ? lang === "hi"
      ? continueSession.title_hi
      : continueSession.title_en
    : "";
  const continueTheme = continueSession
    ? lang === "hi"
      ? continueSession.theme_hi
      : continueSession.theme_en
    : "";

  const title = lang === "hi" ? program.title_hi : program.title_en;
  const intro = lang === "hi" ? program.intro_hi : program.intro_en;
  const doneCount = completed.size;
  const pathPct = Math.round((doneCount / program.days_count) * 100);

  const sections = useMemo(() => {
    const groups: Array<{
      id: "foundation" | "habit" | "deepening";
      end: number;
      days: MeditationSession[];
    }> = [];
    for (const day of program.days) {
      const sec = sittingSectionForDay(day.day_number);
      const last = groups[groups.length - 1];
      if (!last || last.id !== sec.id) {
        groups.push({ id: sec.id, end: sec.end, days: [day] });
      } else {
        last.days.push(day);
      }
    }
    return groups;
  }, [program.days]);

  const activeSection = sittingSectionForDay(continueDay).id;
  const windowDays = nearbyDays(program.days, continueDay, 7);

  return (
    <div className="med-hub pb-10">
      <section className="med-hub__hero relative mb-12 overflow-hidden border border-[var(--line)]">
        <Image
          src="/images/paths/meditation.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 80rem"
          className="object-cover object-center"
        />
        <div className="med-hub__hero-scrim absolute inset-0" aria-hidden />
        <div className="relative z-10 flex min-h-[22rem] flex-col justify-end px-6 py-8 sm:min-h-[26rem] sm:px-10 sm:py-10 lg:px-12">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
            {t("medEyebrow")}
          </p>
          <h1 className="mt-3 max-w-xl font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-white">
            {title}
          </h1>
          <p className="mt-3 max-w-lg text-sm font-light leading-relaxed text-white/75 sm:text-base">
            {intro}
          </p>

          {progress ? (
            <div className="mt-6 max-w-md">
              <div className="mb-2 flex items-baseline justify-between gap-3 text-xs tracking-[0.12em] text-white/55">
                <span>
                  {fill(t("medProgress"), {
                    done: doneCount,
                    total: program.days_count,
                  })}
                </span>
                <span>
                  {progress.streak && progress.streak.current > 0
                    ? fill(t("medStreak"), { n: progress.streak.current })
                    : t("medStreakNone")}
                </span>
              </div>
              <div className="med-hub__path" aria-hidden>
                {sections.map((section) => {
                  const sectionDone = section.days.filter((d) =>
                    completed.has(d.day_number)
                  ).length;
                  const fillPct =
                    (sectionDone / Math.max(1, section.days.length)) * 100;
                  const active = section.id === activeSection;
                  return (
                    <div
                      key={section.id}
                      className={`med-hub__path-seg ${active ? "is-active" : ""}`}
                      title={sectionLabel(section.id, t)}
                    >
                      <div
                        className="med-hub__path-fill"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] tracking-[0.14em] text-white/45">
                {pathPct}% · {sectionLabel(activeSection, t)}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-end gap-4">
            <Link
              href={`/meditation/${continueDay}`}
              className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {doneCount === 0
                ? t("medStart")
                : fill(t("medContinue"), { n: continueDay })}
            </Link>
            {continueSession ? (
              <div className="min-w-0 max-w-sm">
                <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                  Day {continueDay} · {continueSession.duration_minutes} min
                </p>
                <p className="mt-1 font-display text-lg text-white">
                  {continueTitle}
                </p>
                {continueTheme ? (
                  <p className="mt-1 line-clamp-2 text-sm font-light text-white/60">
                    {continueTheme}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {progress?.guest ? (
            <p className="mt-4 text-sm text-white/55">
              {t("medSignInHint")}{" "}
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

      <section className="mb-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-[var(--brass)]">{t("medNearYou")}</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
              {t("medPathTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            {showAll ? t("medHideAllDays") : t("medShowAllDays")}
          </button>
        </div>

        <div className="med-hub__days">
          {(showAll ? program.days : windowDays).map((day) => {
            const done = completed.has(day.day_number);
            const unlocked = isDayUnlocked(
              day.day_number,
              progress?.completedDays ?? [],
              program.days_count
            );
            const current = day.day_number === continueDay;
            const dayTitle = lang === "hi" ? day.title_hi : day.title_en;
            const className = `med-hub__day ${done ? "is-done" : ""} ${
              current ? "is-current" : ""
            } ${!unlocked ? "is-locked" : ""}`;

            if (!unlocked) {
              return (
                <div key={day.id} className={className} aria-disabled>
                  <p className="text-[11px] tracking-[0.16em] text-[var(--text-muted)]">
                    Day {day.day_number}
                  </p>
                  <p className="mt-2 font-display text-lg text-[var(--text-muted)]">
                    {dayTitle}
                  </p>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    {t("medDayLocked")}
                  </p>
                </div>
              );
            }

            return (
              <Link
                key={day.id}
                href={`/meditation/${day.day_number}`}
                className={className}
              >
                <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                  Day {day.day_number} · {day.duration_minutes} min
                </p>
                <p className="mt-2 font-display text-lg text-[var(--text)]">
                  {dayTitle}
                </p>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {done
                    ? t("medDayComplete")
                    : current
                      ? t("medDayAvailable")
                      : t("medDayAvailable")}
                </p>
              </Link>
            );
          })}
        </div>

      </section>

      <section className="border-t border-[var(--hairline)] pt-10">
        <p className="eyebrow text-[var(--brass)]">
          {lang === "hi" ? dailies.title_hi : dailies.title_en}
        </p>
        <p className="mt-2 max-w-xl text-sm font-light text-[var(--text-soft)]">
          {lang === "hi" ? dailies.intro_hi : dailies.intro_en}
        </p>
        <div className="med-hub__dailies mt-6">
          {dailies.sessions.map((s) => (
            <Link
              key={s.id}
              href={`/meditation/daily/${s.id}`}
              className="med-hub__daily group"
            >
              <Image
                src="/images/paths/meditation.jpg"
                alt=""
                fill
                sizes="220px"
                className="object-cover opacity-50 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-65"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="relative z-10 mt-auto p-4">
                <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                  {s.duration_minutes} min
                </p>
                <p className="mt-1 font-display text-lg text-white">
                  {lang === "hi" ? s.title_hi : s.title_en}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-[var(--text-muted)]">
        <Link
          href="/support"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("medBridgeSupport")}
        </Link>
        {" · "}
        <Link
          href="/paths"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("medBridgePaths")}
        </Link>
      </p>
    </div>
  );
}
