"use client";

import type { DashaPeriod } from "@/lib/astrology/types";

type Props = {
  maha: DashaPeriod | null;
  asOfDate: string;
  labelPlanet: (id: string) => string;
  title: string;
  asOfLabel: string;
};

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.max(1, ms / 86_400_000);
}

export default function DashaTimeline({
  maha,
  asOfDate,
  labelPlanet,
  title,
  asOfLabel,
}: Props) {
  if (!maha?.children?.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {title}: —
      </p>
    );
  }

  const total = daysBetween(maha.start, maha.end);
  const cursor = Math.min(
    1,
    Math.max(0, daysBetween(maha.start, asOfDate) / total)
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text)]">
          {title}: {labelPlanet(maha.lord)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {maha.start} → {maha.end} · {asOfLabel} {asOfDate}
        </p>
      </div>
      <div className="relative overflow-hidden border-y border-[var(--brass)]/25 py-4">
        <div className="relative h-11 w-full">
          <div className="flex h-full w-full">
            {maha.children.map((antar) => {
              const w = (daysBetween(antar.start, antar.end) / total) * 100;
              const active =
                asOfDate >= antar.start && asOfDate < antar.end;
              return (
                <div
                  key={`${antar.lord}-${antar.start}`}
                  title={`${labelPlanet(antar.lord)} ${antar.start}→${antar.end}`}
                  className={`relative flex items-center justify-center border-r border-[var(--void)]/40 text-[10px] leading-tight transition ${
                    active
                      ? "bg-[var(--brass)]/50 text-[var(--text)]"
                      : "bg-[var(--brass)]/15 text-[var(--text-muted)]"
                  }`}
                  style={{ width: `${Math.max(w, 0.8)}%` }}
                >
                  <span className="truncate px-0.5">
                    {labelPlanet(antar.lord).slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute top-0 z-10 h-full w-px bg-[var(--text)] shadow-[0_0_8px_rgba(238,242,247,0.5)]"
            style={{ left: `${cursor * 100}%` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
