"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { PracticePath } from "@/lib/paths";
import { readGuestPathDays } from "@/lib/paths-local";

type RunLine = { currentDay: number; completedCount: number };

export default function PathsListClient({ paths }: { paths: PracticePath[] }) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  // pathId → progress; absent = not started (or unknown), which renders
  // nothing — the card must never guess at a run.
  const [runs, setRuns] = useState<Record<string, RunLine>>({});

  useEffect(() => {
    let cancelled = false;

    const fromLocal = (path: PracticePath): RunLine | null => {
      const days = readGuestPathDays(path.id);
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
            const res = await fetch(`/api/paths/${path.id}/run`);
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
      if (!cancelled) setRuns(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [paths, user]);

  if (paths.length === 0) {
    return (
      <p className="max-w-2xl text-[15px] font-light text-[var(--text-muted)]">
        —
      </p>
    );
  }

  return (
    <ul className="max-w-2xl space-y-4">
      {paths.map((path) => {
        const run = runs[path.id];
        const done = run ? run.completedCount >= path.days_count : false;
        return (
          <li key={path.id}>
            <Link
              href={`/paths/${path.id}`}
              className="group block border border-[var(--line)] px-5 py-6 transition hover:border-[var(--brass)]/40"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
                {path.days_count} {lang === "hi" ? "दिन" : "days"}
              </p>
              <h2 className="mt-2 font-display text-2xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                {lang === "hi" ? path.title_hi : path.title_en}
              </h2>
              <p className="mt-2 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
                {lang === "hi" ? path.intro_hi : path.intro_en}
              </p>
              {run ? (
                <p className="mt-3 text-sm text-[var(--brass-soft)]">
                  {done
                    ? t("pathRunDone")
                    : t("pathRunProgress")
                        .replace("{n}", String(run.currentDay))
                        .replace("{total}", String(path.days_count))}
                </p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
