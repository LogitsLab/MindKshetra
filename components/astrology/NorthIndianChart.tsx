"use client";

import type { ChartPayload, PlanetId } from "@/lib/astrology/types";
import { PLANET_LABELS } from "@/lib/astrology/signs";

const SHORT: Partial<Record<PlanetId, string>> = {
  sun: "Su",
  moon: "Mo",
  mars: "Ma",
  mercury: "Me",
  jupiter: "Ju",
  venus: "Ve",
  saturn: "Sa",
  rahu: "Ra",
  ketu: "Ke",
  ascendant: "As",
};

/** Approximate label anchors for North Indian diamond houses */
const CENTROIDS: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 22 },
  2: { x: 22, y: 12 },
  3: { x: 12, y: 38 },
  4: { x: 22, y: 72 },
  5: { x: 50, y: 88 },
  6: { x: 78, y: 72 },
  7: { x: 78, y: 50 },
  8: { x: 88, y: 28 },
  9: { x: 72, y: 12 },
  10: { x: 50, y: 62 },
  11: { x: 28, y: 28 },
  12: { x: 28, y: 50 },
};

const HOUSE_NUM: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 8 },
  2: { x: 14, y: 8 },
  3: { x: 6, y: 38 },
  4: { x: 14, y: 92 },
  5: { x: 50, y: 96 },
  6: { x: 86, y: 92 },
  7: { x: 94, y: 50 },
  8: { x: 94, y: 14 },
  9: { x: 78, y: 6 },
  10: { x: 50, y: 52 },
  11: { x: 22, y: 18 },
  12: { x: 18, y: 52 },
};

type Props = {
  chart: ChartPayload;
  className?: string;
  legend?: string;
};

export default function NorthIndianChart({
  chart,
  className = "",
  legend,
}: Props) {
  const byHouse: Record<number, string[]> = {};
  for (let h = 1; h <= 12; h++) byHouse[h] = [];

  if (chart.ascendant?.house) {
    byHouse[chart.ascendant.house].push("As");
  }
  for (const p of chart.planets) {
    if (p.house) {
      const g = SHORT[p.id] || p.id.slice(0, 2);
      byHouse[p.house].push(p.retrograde ? `${g}ʳ` : g);
    }
  }

  if (chart.tobUnknown) {
    return (
      <div
        className={`flex aspect-square max-w-md items-center justify-center border border-[var(--line)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--text-muted)] ${className}`}
      >
        Birth time unknown — Ascendant and house chart are disabled.
      </div>
    );
  }

  return (
    <div className={className}>
      <svg
        viewBox="0 0 100 100"
        className="aspect-square w-full max-w-md text-[var(--text)]"
        role="img"
        aria-label="North Indian Rasi chart"
      >
        <rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          fill="var(--panel)"
          stroke="var(--brass)"
          strokeWidth="0.8"
        />
        <line x1="0" y1="0" x2="100" y2="100" stroke="var(--line)" strokeWidth="0.4" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="var(--line)" strokeWidth="0.4" />
        <line x1="50" y1="0" x2="0" y2="50" stroke="var(--line)" strokeWidth="0.4" />
        <line x1="50" y1="0" x2="100" y2="50" stroke="var(--line)" strokeWidth="0.4" />
        <line x1="0" y1="50" x2="50" y2="100" stroke="var(--line)" strokeWidth="0.4" />
        <line x1="100" y1="50" x2="50" y2="100" stroke="var(--line)" strokeWidth="0.4" />
        <polygon
          points="50,0 100,50 50,100 0,50"
          fill="none"
          stroke="var(--brass)"
          strokeWidth="0.7"
        />

        {/* Lagna house emphasis */}
        {chart.ascendant?.house === 1 ? (
          <polygon
            points="50,0 75,25 50,50 25,25"
            fill="var(--brass)"
            fillOpacity="0.08"
          />
        ) : null}

        {Object.entries(HOUSE_NUM).map(([house, c]) => (
          <text
            key={`hn-${house}`}
            x={c.x}
            y={c.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="2.6"
            fill="var(--text-muted)"
            opacity="0.7"
          >
            {house}
          </text>
        ))}

        {Object.entries(byHouse).map(([house, glyphs]) => {
          const c = CENTROIDS[Number(house)];
          if (!c || glyphs.length === 0) return null;
          const isLagna = Number(house) === 1;
          return (
            <text
              key={house}
              x={c.x}
              y={c.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="3.1"
              fontWeight={isLagna ? 600 : 400}
              fill="var(--brass-soft)"
              style={{ fontFamily: "var(--font-body), sans-serif" }}
            >
              {glyphs.join(" ")}
            </text>
          );
        })}

        <title>
          {chart.planets
            .map(
              (p) =>
                `${PLANET_LABELS[p.id].en} H${p.house ?? "—"} ${p.sign}${p.retrograde ? " R" : ""}`
            )
            .join(", ")}
        </title>
      </svg>
      {legend ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{legend}</p>
      ) : null}
    </div>
  );
}
