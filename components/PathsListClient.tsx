"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { Journey } from "@/lib/journeys/core";
import { readGuestJourneyDays } from "@/lib/journeys/local";
import type { DictKey } from "@/lib/i18n/dictionary";
import { pathCover } from "@/lib/paths/cover";

type RunLine = { currentDay: number; completedCount: number };

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    template
  );
}

function pickFeatured(
  paths: Journey[],
  runs: Record<string, RunLine>
): Journey | null {
  if (!paths.length) return null;
  const inProgress = paths
    .map((p) => ({ path: p, run: runs[p.id] }))
    .filter(
      (x) =>
        x.run &&
        x.run.completedCount > 0 &&
        x.run.completedCount < x.path.days_count
    )
    .sort(
      (a, b) => (b.run?.completedCount ?? 0) - (a.run?.completedCount ?? 0)
    );
  if (inProgress[0]) return inProgress[0].path;
  return paths.find((p) => p.id === "gita-21") ?? paths[0];
}

export default function PathsListClient({ paths }: { paths: Journey[] }) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [runs, setRuns] = useState<Record<string, RunLine>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fromLocal = (path: Journey): RunLine | null => {
      const days = readGuestJourneyDays(path.id, path.days_count);
      if (days.length === 0) return null;
      return {
        currentDay: Math.min(
          path.days_count,
          (days[days.length - 1] ?? 0) + 1
        ),
        completedCount: days.length,
      };
    };

    void (async () => {
      const next: Record<string, RunLine> = {};
      await Promise.all(
        paths.map(async (path) => {
          let line: RunLine | null = null;
          try {
            const res = await fetch(`/api/journeys/${path.id}/run`);
            if (res.ok) {
              const data = (await res.json()) as {
                currentDay?: number;
                completedDays?: number[];
                guest?: boolean;
              };
              if (data.guest) {
                line = fromLocal(path);
              } else if ((data.completedDays?.length ?? 0) > 0) {
                line = {
                  currentDay: data.currentDay ?? 1,
                  completedCount: data.completedDays?.length ?? 0,
                };
              }
            } else {
              line = fromLocal(path);
            }
          } catch {
            line = fromLocal(path);
          }
          if (line) next[path.id] = line;
        })
      );
      if (!cancelled) {
        setRuns(next);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paths, user]);

  const featured = useMemo(
    () => pickFeatured(paths, runs),
    [paths, runs]
  );

  const arcs = paths.filter((p) => p.days_count >= 14);
  const weeks = paths.filter((p) => p.days_count < 14);

  if (paths.length === 0) {
    return (
      <p className="max-w-2xl text-[15px] font-light text-[var(--text-muted)]">
        —
      </p>
    );
  }

  const featuredRun = featured ? runs[featured.id] : undefined;
  const continueDay = featuredRun?.currentDay ?? 1;
  const doneCount = featuredRun?.completedCount ?? 0;
  const featuredDone = featured
    ? doneCount >= featured.days_count
    : false;
  const pathPct = featured
    ? Math.round((doneCount / featured.days_count) * 100)
    : 0;
  const continueDayMeta = featured?.days.find((d) => d.day === continueDay);
  const continueTitle = continueDayMeta
    ? lang === "hi"
      ? continueDayMeta.title_hi
      : continueDayMeta.title_en
    : "";

  return (
    <div className="paths-hub pb-10">
      {featured ? (
        <section className="med-hub__hero relative mb-12 overflow-hidden border border-[var(--line)]">
          <Image
            src={pathCover(featured.id)}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 80rem"
            className="object-cover object-center"
          />
          <div className="med-hub__hero-scrim absolute inset-0" aria-hidden />
          <div className="relative z-10 flex min-h-[22rem] flex-col justify-end px-6 py-8 sm:min-h-[26rem] sm:px-10 sm:py-10 lg:px-12">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
              {t("pathListEyebrow")}
            </p>
            <h1 className="mt-3 max-w-xl font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-white">
              {lang === "hi" ? featured.title_hi : featured.title_en}
            </h1>
            <p className="mt-3 max-w-lg text-sm font-light leading-relaxed text-white/75 sm:text-base">
              {lang === "hi" ? featured.intro_hi : featured.intro_en}
            </p>

            {ready ? (
              <div className="mt-6 max-w-md">
                <div className="mb-2 flex items-baseline justify-between gap-3 text-xs tracking-[0.12em] text-white/55">
                  <span>
                    {fill(t("pathRunProgress"), {
                      n: Math.min(continueDay, featured.days_count),
                      total: featured.days_count,
                    })}
                  </span>
                  <span>
                    {featuredDone
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
                <p className="mt-2 text-[11px] tracking-[0.14em] text-white/45">
                  {pathPct}%
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-end gap-4">
              <Link
                href={`/paths/${featured.id}`}
                className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {doneCount === 0
                  ? t("pathStart")
                  : featuredDone
                    ? t("pathOpenJourney")
                    : fill(t("pathContinue"), { n: continueDay })}
              </Link>
              {continueDayMeta ? (
                <div className="min-w-0 max-w-sm">
                  <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                    {fill(t("pathDay"), { n: continueDay })} ·{" "}
                    {continueDayMeta.minutes} {t("pathDayMinutes")}
                  </p>
                  <p className="mt-1 font-display text-lg text-white">
                    {continueTitle}
                  </p>
                </div>
              ) : null}
            </div>

            {!user || user.is_anonymous ? (
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
      ) : null}

      {arcs.length ? (
        <section className="mb-12">
          <p className="eyebrow text-[var(--brass)]">{t("pathArcEyebrow")}</p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
            {t("pathArcTitle")}
          </h2>
          <p className="mt-2 max-w-xl text-sm font-light text-[var(--text-soft)]">
            {t("pathListIntro")}
          </p>
          <div className="med-hub__days mt-6">
            {arcs.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                run={runs[path.id]}
                lang={lang}
                t={t}
                featured={featured?.id === path.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {weeks.length ? (
        <section className="border-t border-[var(--hairline)] pt-10">
          <p className="eyebrow text-[var(--brass)]">{t("pathWeekEyebrow")}</p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
            {t("pathWeekTitle")}
          </h2>
          <p className="mt-2 max-w-xl text-sm font-light text-[var(--text-soft)]">
            {t("pathWeekIntro")}
          </p>
          <div className="med-hub__dailies mt-6">
            {weeks.map((path) => {
              const run = runs[path.id];
              const done = run
                ? run.completedCount >= path.days_count
                : false;
              return (
                <Link
                  key={path.id}
                  href={`/paths/${path.id}`}
                  className="med-hub__daily group"
                >
                  <Image
                    src={pathCover(path.id)}
                    alt=""
                    fill
                    sizes="220px"
                    className="object-cover opacity-50 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-65"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="relative z-10 mt-auto p-4">
                    <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                      {path.days_count}{" "}
                      {lang === "hi" ? "दिन" : "days"}
                      {run
                        ? ` · ${
                            done
                              ? t("pathRunDone")
                              : fill(t("pathRunProgress"), {
                                  n: run.currentDay,
                                  total: path.days_count,
                                })
                          }`
                        : ""}
                    </p>
                    <p className="mt-1 font-display text-lg text-white">
                      {lang === "hi" ? path.title_hi : path.title_en}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="mt-10 text-sm text-[var(--text-muted)]">
        <Link
          href="/meditation"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("pathBridgeMed")}
        </Link>
        {" · "}
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

function PathCard({
  path,
  run,
  lang,
  t,
  featured,
}: {
  path: Journey;
  run?: RunLine;
  lang: "en" | "hi";
  t: (k: DictKey) => string;
  featured: boolean;
}) {
  const done = run ? run.completedCount >= path.days_count : false;
  const className = `med-hub__day paths-hub__card ${
    featured ? "is-current" : ""
  } ${done ? "is-done" : ""}`;

  return (
    <Link href={`/paths/${path.id}`} className={className}>
      <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
        {path.days_count} {lang === "hi" ? "दिन" : "days"}
      </p>
      <p className="mt-2 font-display text-lg text-[var(--text)]">
        {lang === "hi" ? path.title_hi : path.title_en}
      </p>
      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[var(--text-muted)]">
        {lang === "hi" ? path.intro_hi : path.intro_en}
      </p>
      <p className="mt-auto pt-4 text-xs text-[var(--brass-soft)]">
        {done
          ? t("pathRunDone")
          : run
            ? fill(t("pathRunProgress"), {
                n: run.currentDay,
                total: path.days_count,
              })
            : t("pathNotStarted")}
      </p>
    </Link>
  );
}
