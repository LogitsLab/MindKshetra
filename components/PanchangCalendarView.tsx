"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import EmptyState from "@/components/EmptyState";
import { SkeletonPanel } from "@/components/Skeleton";

type CalDay = {
  date: string;
  tithi: string;
  tithiIndex: number;
  nakshatra: string;
  vaar: string;
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
};

type Observance = {
  date: string;
  kind: string;
  label: string;
};

type MonthPayload = {
  month: string;
  ianaTz: string;
  days: CalDay[];
  observances: Observance[];
};

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function currentMonthStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Pad to Monday-start weeks, then chunk into 7. */
function weeksFromDays(days: CalDay[]): Array<Array<CalDay | null>> {
  if (days.length === 0) return [];
  const first = new Date(`${days[0].date}T12:00:00`);
  // JS: 0=Sun … 6=Sat → Mon=0 … Sun=6
  const mondayOffset = (first.getDay() + 6) % 7;
  const cells: Array<CalDay | null> = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<CalDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PanchangCalendarView() {
  const { t } = useLanguage();
  const [month, setMonth] = useState(currentMonthStamp);
  const [data, setData] = useState<MonthPayload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/panchang/calendar?month=${encodeURIComponent(month)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((json: MonthPayload) => {
        if (cancelled) return;
        setData(json);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const weeks = useMemo(
    () => (data ? weeksFromDays(data.days) : []),
    [data]
  );

  if (state === "error") {
    return (
      <EmptyState
        title={t("panchangUnavailable")}
        body={t("panchangUnavailableBody")}
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="min-h-10 border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
        >
          ← {t("panchangCalendarPrev")}
        </button>
        <p className="font-display text-xl text-[var(--text)]">{month}</p>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="min-h-10 border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
        >
          {t("panchangCalendarNext")} →
        </button>
      </div>

      {state === "loading" && !data ? (
        <SkeletonPanel widths={["w-40", "w-56"]} label={t("loading")} />
      ) : data ? (
        <>
          <div className="overflow-x-auto">
            <div className="grid min-w-[36rem] grid-cols-7 gap-px border border-[var(--hairline)] bg-[var(--hairline)]">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="bg-[var(--surface)] px-2 py-2 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]"
                >
                  {d}
                </div>
              ))}
              {weeks.flatMap((week, wi) =>
                week.map((day, di) => (
                  <div
                    key={day?.date ?? `e-${wi}-${di}`}
                    className="min-h-[4.5rem] bg-[var(--surface)] px-2 py-2"
                  >
                    {day ? (
                      <>
                        <p className="text-xs tabular-nums text-[var(--text)]">
                          {day.date.slice(8)}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                          {day.tithi}
                        </p>
                        <p className="text-[10px] text-[var(--brass-soft)]">
                          {day.nakshatra}
                        </p>
                      </>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {data.observances.length > 0 ? (
            <section className="mt-10 border-t border-[var(--hairline)] pt-8">
              <h2 className="font-display text-2xl text-[var(--text)]">
                {t("panchangObservances")}
              </h2>
              <ul className="mt-4 space-y-3">
                {data.observances.map((o) => (
                  <li
                    key={`${o.date}-${o.kind}-${o.label}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--hairline)] py-2"
                  >
                    <span className="font-display text-[var(--text)]">
                      {o.label}
                    </span>
                    <span className="text-sm tabular-nums text-[var(--text-muted)]">
                      {o.date}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <p className="mt-10">
        <Link
          href="/panchang"
          className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          ← {t("panchangBackToday")}
        </Link>
      </p>
    </div>
  );
}
