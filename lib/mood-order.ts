import type { BlendedVerdict, LifeArea } from "@/lib/astrology/types";
import { moods } from "@/lib/moods-data";

/**
 * Chart-aware mood ordering (plan Phase 3 — the "pressure → practice"
 * wedge's gentlest form). Pure function over the chart's already-computed
 * blended verdicts: life areas under tension float their related moods
 * upward; everything else keeps the default order (stable sort).
 *
 * Deliberately NOT in lib/moods-data.ts — that file is eval-gated and this
 * module never changes retrieval, only presentation order. Provenance in UI
 * stays soft ("ordered alongside your chart"), never causal.
 */
const AREA_MOODS: Record<LifeArea, string[]> = {
  career: ["unmotivated", "failure", "big-decision"],
  marriage: ["conflict", "lonely", "jealous"],
  health: ["anxious", "overwhelmed"],
  finance: ["anxious", "fearful"],
  education: ["confused", "purpose"],
  travel: ["fearful", "hopeful"],
};

const CONFIDENCE_WEIGHT: Record<BlendedVerdict["confidence"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function orderMoods(verdicts: BlendedVerdict[]): {
  order: string[];
  basis: Array<{ lifeArea: LifeArea; score: number }>;
} {
  const moodScore = new Map<string, number>();
  const basis: Array<{ lifeArea: LifeArea; score: number }> = [];

  for (const verdict of verdicts) {
    const tension = verdict.tensions.length;
    if (tension === 0) continue;
    const score =
      tension * CONFIDENCE_WEIGHT[verdict.confidence] +
      (verdict.dashaSupports ? 0 : 1);
    basis.push({ lifeArea: verdict.lifeArea, score });
    for (const moodId of AREA_MOODS[verdict.lifeArea] ?? []) {
      moodScore.set(moodId, (moodScore.get(moodId) ?? 0) + score);
    }
  }

  const order = moods
    .map((mood, index) => ({ id: mood.id, index, score: moodScore.get(mood.id) ?? 0 }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.id);

  basis.sort((a, b) => b.score - a.score);
  return { order, basis };
}
