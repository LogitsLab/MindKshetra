"use client";

import { SHORT } from "@/components/astrology/NorthIndianChart";
import { PLANET_LABELS, SIGNS } from "@/lib/astrology/signs";
import type { ChartPayload, PlanetId, SignId } from "@/lib/astrology/types";

/**
 * Classic South Indian fixed-sign grid (signIndex 0 = Aries).
 * Positions are 1-indexed CSS grid (col, row).
 */
const SI_CELLS: Array<{ signIndex: number; col: number; row: number }> = [
  { signIndex: 11, col: 1, row: 1 }, // Pisces
  { signIndex: 0, col: 2, row: 1 }, // Aries
  { signIndex: 1, col: 3, row: 1 }, // Taurus
  { signIndex: 2, col: 4, row: 1 }, // Gemini
  { signIndex: 10, col: 1, row: 2 }, // Aquarius
  { signIndex: 3, col: 4, row: 2 }, // Cancer
  { signIndex: 9, col: 1, row: 3 }, // Capricorn
  { signIndex: 4, col: 4, row: 3 }, // Leo
  { signIndex: 8, col: 1, row: 4 }, // Sagittarius
  { signIndex: 7, col: 2, row: 4 }, // Scorpio
  { signIndex: 6, col: 3, row: 4 }, // Libra
  { signIndex: 5, col: 4, row: 4 }, // Virgo
];

const SIGN_SHORT: Record<SignId, string> = {
  aries: "Ar",
  taurus: "Ta",
  gemini: "Ge",
  cancer: "Cn",
  leo: "Le",
  virgo: "Vi",
  libra: "Li",
  scorpio: "Sc",
  sagittarius: "Sg",
  capricorn: "Cp",
  aquarius: "Aq",
  pisces: "Pi",
};

type CellPlanet = { id: PlanetId | "ascendant"; glyph: string };

type Props = {
  chart: ChartPayload;
  className?: string;
  legend?: string;
  /** Override placements (e.g. Navamsa) — skips tobUnknown gate when set */
  override?: {
    ascendant: ChartPayload["ascendant"];
    planets: ChartPayload["planets"];
  };
  emptyLabel?: string;
  onPlanetClick?: (planetId: string) => void;
};

export default function SouthIndianChart({
  chart,
  className = "",
  legend,
  override,
  emptyLabel,
  onPlanetClick,
}: Props) {
  const ascendant = override?.ascendant ?? chart.ascendant;
  const planets = override?.planets ?? chart.planets;

  if (!override && chart.tobUnknown) {
    return (
      <div
        className={`flex aspect-square max-w-md items-center justify-center border border-[var(--line)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--text-muted)] ${className}`}
      >
        {emptyLabel ??
          "Birth time unknown — Ascendant and house chart are disabled."}
      </div>
    );
  }

  if (!ascendant && !override) {
    return null;
  }

  const bySign: Record<number, CellPlanet[]> = {};
  for (let i = 0; i < 12; i++) bySign[i] = [];

  if (ascendant) {
    bySign[ascendant.signIndex].push({ id: "ascendant", glyph: "As" });
  }
  for (const p of planets) {
    const g = SHORT[p.id] || p.id.slice(0, 2);
    bySign[p.signIndex].push({
      id: p.id,
      glyph: p.retrograde ? `${g}ʳ` : g,
    });
  }

  const lagnaSign = ascendant?.signIndex ?? -1;

  return (
    <div className={className}>
      <div
        className="grid aspect-square w-full max-w-md grid-cols-4 grid-rows-4 border border-[var(--brass)] bg-[var(--panel)]"
        role="img"
        aria-label="South Indian Rasi chart"
      >
        {SI_CELLS.map(({ signIndex, col, row }) => {
          const sign = SIGNS[signIndex];
          const items = bySign[signIndex] ?? [];
          const isLagna = signIndex === lagnaSign;

          return (
            <div
              key={signIndex}
              className="relative flex flex-col items-center justify-center border border-[var(--line)]/60 p-1"
              style={{
                gridColumn: col,
                gridRow: row,
                ...(isLagna
                  ? {
                      backgroundColor:
                        "color-mix(in srgb, var(--brass) 12%, transparent)",
                    }
                  : {}),
              }}
            >
              <span className="absolute left-1 top-0.5 text-[0.6rem] text-[var(--text-muted)] opacity-70">
                {SIGN_SHORT[sign]}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 pt-2">
                {items.map((item, i) =>
                  onPlanetClick ? (
                    <button
                      key={`${item.id}-${i}`}
                      type="button"
                      onClick={() => onPlanetClick(item.id)}
                      className="cursor-pointer text-xs font-medium text-[var(--brass-soft)] transition hover:text-[var(--brass)]"
                      style={{ fontFamily: "var(--font-body), sans-serif" }}
                    >
                      {item.glyph}
                    </button>
                  ) : (
                    <span
                      key={`${item.id}-${i}`}
                      className="text-xs font-medium text-[var(--brass-soft)]"
                      style={{ fontFamily: "var(--font-body), sans-serif" }}
                    >
                      {item.glyph}
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}

        <div
          className="flex items-center justify-center border border-[var(--line)]/60 bg-[var(--panel)]"
          style={{ gridColumn: "2 / 4", gridRow: "2 / 4" }}
        >
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Rasi
          </span>
        </div>
      </div>
      {legend ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{legend}</p>
      ) : null}
      <p className="sr-only">
        {planets
          .map(
            (p) =>
              `${PLANET_LABELS[p.id].en} ${p.sign}${p.retrograde ? " R" : ""}`
          )
          .join(", ")}
      </p>
    </div>
  );
}
