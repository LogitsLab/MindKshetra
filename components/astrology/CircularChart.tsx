"use client";

import { PLANET_ABBR, SIGN_ABBR, SIGNS } from "@/lib/astrology/signs";
import type {
  ChartPayload,
  HouseCusp,
  PlanetId,
  PlanetPosition,
} from "@/lib/astrology/types";

export type WheelMode = "rashi" | "bhav" | "combine";

type Props = {
  chart: ChartPayload;
  className?: string;
  legend?: string;
  override?: {
    ascendant: ChartPayload["ascendant"];
    planets: ChartPayload["planets"];
  };
  /** When set, used instead of D1 planets (e.g. KP Krishnamurti longitudes). */
  planetsOverride?: PlanetPosition[];
  lagnaLongitude?: number | null;
  cusps?: HouseCusp[] | null;
  mode?: WheelMode;
  emptyLabel?: string;
  onPlanetClick?: (id: string) => void;
};

const CX = 50;
const CY = 50;
const OUTER = 46;
const INNER = 18;
const LABEL_R = 41;
const PLANET_R = 32;

/** Sidereal 0° at east (9 o'clock); longitude increases toward the south (6 o'clock). */
export function polar(lon: number, r: number, cx = CX, cy = CY) {
  const rad = ((180 + lon) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function wedgePath(startLon: number, endLon: number, rInner: number, rOuter: number) {
  const a0 = polar(startLon, rOuter);
  const a1 = polar(endLon, rOuter);
  const b1 = polar(endLon, rInner);
  const b0 = polar(startLon, rInner);
  return `M ${a0.x.toFixed(3)} ${a0.y.toFixed(3)} A ${rOuter} ${rOuter} 0 0 1 ${a1.x.toFixed(3)} ${a1.y.toFixed(3)} L ${b1.x.toFixed(3)} ${b1.y.toFixed(3)} A ${rInner} ${rInner} 0 0 0 ${b0.x.toFixed(3)} ${b0.y.toFixed(3)} Z`;
}

function staggerRadius(index: number, cluster: number): number {
  if (cluster <= 1) return PLANET_R;
  const slot = index - (cluster - 1) / 2;
  return PLANET_R - slot * 4.2;
}

export default function CircularChart({
  chart,
  className = "",
  legend,
  override,
  planetsOverride,
  lagnaLongitude,
  cusps,
  mode = "rashi",
  emptyLabel,
  onPlanetClick,
}: Props) {
  const ascendant = override?.ascendant ?? chart.ascendant;
  const planets = planetsOverride ?? override?.planets ?? chart.planets;
  const houseCusps = cusps ?? chart.placidusCusps;
  const showBhav = (mode === "bhav" || mode === "combine") && Boolean(houseCusps?.length);
  const showRashi = mode !== "bhav" || !showBhav;

  if (!override && !planetsOverride && chart.tobUnknown) {
    return (
      <div
        className={`flex aspect-square max-w-md items-center justify-center border border-[var(--line)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--text-muted)] ${className}`}
      >
        {emptyLabel ??
          "Birth time unknown — Ascendant and house chart are disabled."}
      </div>
    );
  }

  const lagnaLon =
    lagnaLongitude ??
    ascendant?.longitude ??
    houseCusps?.[0]?.longitude ??
    null;
  const lagnaSign = ascendant?.signIndex ?? Math.floor(((lagnaLon ?? 0) % 360) / 30);

  const bodies: Array<{
    id: PlanetId | "ascendant";
    longitude: number;
    glyph: string;
  }> = [];
  if (ascendant && lagnaLon != null) {
    bodies.push({ id: "ascendant", longitude: lagnaLon, glyph: "As" });
  }
  for (const p of planets) {
    const g = PLANET_ABBR[p.id] || p.id.slice(0, 2);
    bodies.push({
      id: p.id,
      longitude: p.longitude,
      glyph: p.retrograde ? `${g}ʳ` : g,
    });
  }

  const buckets = new Map<string, typeof bodies>();
  for (const b of bodies) {
    const key = String(Math.round(b.longitude * 2) / 2);
    const arr = buckets.get(key) ?? [];
    arr.push(b);
    buckets.set(key, arr);
  }

  return (
    <div className={className}>
      <svg
        viewBox="0 0 100 100"
        className="aspect-square w-full max-w-md text-[var(--text)]"
        role="img"
        aria-label="Circular rasi chart"
      >
        <circle
          cx={CX}
          cy={CY}
          r={OUTER}
          fill="var(--panel)"
          stroke="var(--brass)"
          strokeWidth="0.7"
        />
        <circle
          cx={CX}
          cy={CY}
          r={INNER}
          fill="var(--void, #07090f)"
          stroke="var(--line)"
          strokeWidth="0.35"
        />

        {showRashi
          ? SIGNS.map((sign, i) => {
              const start = i * 30;
              const mid = start + 15;
              const isLagna = i === lagnaSign;
              const label = polar(mid, LABEL_R);
              return (
                <g key={sign}>
                  <path
                    d={wedgePath(start, start + 30, INNER, OUTER)}
                    fill={isLagna ? "var(--brass)" : "transparent"}
                    fillOpacity={isLagna ? 0.1 : 0}
                    stroke="var(--line)"
                    strokeWidth="0.35"
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="2.6"
                    fill="var(--text-muted)"
                    opacity="0.85"
                  >
                    {SIGN_ABBR[sign]}
                  </text>
                </g>
              );
            })
          : null}

        {showBhav && houseCusps
          ? houseCusps.map((c, i) => {
              const next = houseCusps[(i + 1) % houseCusps.length];
              const start = c.longitude;
              let span = (next.longitude - start + 360) % 360;
              if (span < 1) span = 30;
              const mid = (start + span / 2) % 360;
              const tick = polar(start, OUTER);
              const tickIn = polar(start, mode === "combine" ? OUTER - 5 : INNER);
              const num = polar(mid, mode === "bhav" ? (INNER + OUTER) / 2 : OUTER - 8);
              return (
                <g key={`h-${c.house}`}>
                  {mode === "bhav" ? (
                    <path
                      d={wedgePath(start, start + span, INNER, OUTER)}
                      fill="transparent"
                      stroke="var(--brass)"
                      strokeWidth="0.45"
                      strokeOpacity="0.55"
                    />
                  ) : (
                    <line
                      x1={tickIn.x}
                      y1={tickIn.y}
                      x2={tick.x}
                      y2={tick.y}
                      stroke="var(--brass-soft)"
                      strokeWidth="0.7"
                    />
                  )}
                  <text
                    x={num.x}
                    y={num.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="2.4"
                    fill="var(--brass-soft)"
                    opacity="0.9"
                  >
                    {c.house}
                  </text>
                </g>
              );
            })
          : null}

        {lagnaLon != null
          ? (() => {
              const tip = polar(lagnaLon, OUTER + 5.5);
              const left = polar(lagnaLon - 4, OUTER + 1.2);
              const right = polar(lagnaLon + 4, OUTER + 1.2);
              return (
                <polygon
                  points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
                  fill="var(--brass)"
                />
              );
            })()
          : null}

        {Array.from(buckets.values()).flatMap((cluster) =>
          cluster.map((item, i) => {
            const pt = polar(item.longitude, staggerRadius(i, cluster.length));
            return (
              <text
                key={`${item.id}-${i}-${item.longitude.toFixed(2)}`}
                x={pt.x}
                y={pt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="3.2"
                fontWeight={item.id === "ascendant" ? 600 : 400}
                fill="var(--brass-soft)"
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  cursor: onPlanetClick ? "pointer" : undefined,
                }}
                onClick={
                  onPlanetClick
                    ? (e) => {
                        e.stopPropagation();
                        onPlanetClick(item.id);
                      }
                    : undefined
                }
              >
                {item.glyph}
              </text>
            );
          })
        )}

        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="2.4"
          fill="var(--text-muted)"
          style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
        >
          {mode === "bhav" ? "Bhav" : mode === "combine" ? "Mix" : "Rasi"}
        </text>
      </svg>
      {legend ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{legend}</p>
      ) : null}
    </div>
  );
}
