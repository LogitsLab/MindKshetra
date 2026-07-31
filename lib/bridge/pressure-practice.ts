import type { BlendedVerdict, LifeArea } from "@/lib/astrology/types";
import { LIFE_AREA_TAGS } from "@/lib/bridge/chart-to-verse";

/**
 * Pressure → Practice: the deterministic basis for the chart-overview card
 * (plan Phase 3.3, the moat wedge). Chart fact → verse themes → one small
 * action. No LLM anywhere: the fact is the verdict's own tension string, the
 * verse comes from LIFE_AREA_TAGS via ordinary tag lookup, and the action is
 * a rotating pick from a fixed, area-keyed pool authored EN+HI in i18n.
 *
 * Provenance discipline (see chart-to-verse.ts header): the card states that
 * a teaching is READ ALONGSIDE the pressure, never that the chart chose the
 * verse. Copy that claims causation is a regression.
 *
 * Lives in lib/bridge/ because it imports astrology types and feeds a Gita
 * surface — same neutral ground, same reasoning as chartThemes.
 */

/** Actions authored per area in lib/i18n (ppAction_{area}_{0..N-1}). */
export const PP_ACTION_POOL_SIZE = 3;

export type PressureBasis = {
  area: LifeArea;
  /** The verdict's leading tension — a real, deterministic chart fact. */
  fact: string;
  /** Dasha window or timing note when the verdict carries one. */
  timing: string | null;
  /** Which of the area's pooled actions today shows (rotates by IST day). */
  actionIndex: number;
  /** Verse tags for the area — the same bridge vocabulary chartThemes uses. */
  tags: string[];
};

const CONFIDENCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Picks the area under the most pressure and assembles the card basis.
 *
 * Ranking is tension-weight (`tensions.length * confidence`), which is NOT
 * the same as ChartHub's glance pick (pure confidence): the glance answers
 * "what stands out", this answers "what presses". A chart with no tensions
 * anywhere returns null — a mind at ease gets no pressure card, and the
 * surface stays quiet rather than inventing weight.
 *
 * @param dayNumber whole days since epoch for the viewer's practice day
 *   (IST by product convention); drives the daily action rotation.
 */
export function pressureBasis(
  verdicts: BlendedVerdict[] | undefined | null,
  dayNumber: number
): PressureBasis | null {
  if (!Array.isArray(verdicts) || verdicts.length === 0) return null;

  let best: BlendedVerdict | null = null;
  let bestWeight = 0;
  for (const v of verdicts) {
    if (!v || !(v.lifeArea in LIFE_AREA_TAGS)) continue;
    const tensions = Array.isArray(v.tensions) ? v.tensions : [];
    if (tensions.length === 0) continue;
    const weight = tensions.length * (CONFIDENCE_RANK[v.confidence] ?? 1);
    // Strict > keeps the earlier verdict on ties — verdict order is the
    // engine's own area order, so the pick stays stable across renders.
    if (weight > bestWeight) {
      best = v;
      bestWeight = weight;
    }
  }
  if (!best) return null;

  const fact = firstNonEmpty(best.tensions[0], best.theme);
  if (!fact) return null;

  const safeDay = Number.isFinite(dayNumber) ? Math.max(0, Math.floor(dayNumber)) : 0;

  return {
    area: best.lifeArea,
    fact,
    timing: firstNonEmpty(best.mahaWindow, best.timing),
    actionIndex: safeDay % PP_ACTION_POOL_SIZE,
    tags: LIFE_AREA_TAGS[best.lifeArea] ?? [],
  };
}

/**
 * Deterministic daily verse pick from the area's tag matches: stable
 * chapter/verse ordering, then a day-rotating index. Same verse all day,
 * different verse tomorrow, no randomness.
 */
export function pickVerseIndex(count: number, dayNumber: number): number {
  if (count <= 0) return 0;
  const safeDay = Number.isFinite(dayNumber) ? Math.max(0, Math.floor(dayNumber)) : 0;
  return safeDay % count;
}
