import type { BlendedVerdict, LifeArea } from "@/lib/astrology/types";

/**
 * chart ──▶ verse-theme bridge.
 *
 *   BlendedVerdict[]  ──▶  LIFE_AREA_TAGS  ──▶  tag[]  ──▶  retrieveSlokas(extraTags)
 *   (career, marriage,      6 life areas         real tags     supporting signal only
 *    health, finance,       x 2-3 tags           from
 *    education, travel)                          slokas.json
 *
 * Lives in lib/bridge/ ON PURPOSE (eng review decision 1). Putting it inside
 * lib/astrology/ would make the astrology half depend on Gita internals, and a
 * future Gita->chart lookup would then be a cycle. Here, neither domain imports
 * the other: this module imports both and nothing imports it back except the
 * routes. Both halves stay independently deletable.
 *
 * ── Calibration warning, read before trusting this ──────────────────────────
 * lib/retrieve.ts scores tag matches at `* 0.3` and vector similarity at
 * `* 0.7 * 10`, and inside tagScoreSlokas plain token overlap already
 * contributes +1.8/+2.0 per token. So a tag injected here contributes at most
 * ~0.57 against a vector arm that reaches ~7.0. The chart is a SUPPORTING
 * signal; it nudges ranks 3-5 and rarely changes the primary verse.
 *
 * That is why the product thesis was corrected: the differentiator is the
 * chart-READING voice (which uses real AreaFact detail, dasha windows and house
 * placements), not chart-driven verse selection. Do not build UI that claims a
 * verse was chosen "because" of the chart — see lib/bridge/README-provenance.
 */

/** Every tag below is verified present in data/slokas.json (26-tag vocabulary). */
export const LIFE_AREA_TAGS: Record<LifeArea, string[]> = {
  career: [
    "duty_responsibility",
    "overwhelm_burnout",
    "action_without_attachment",
  ],
  marriage: [
    "relationships_conflict",
    "attachment_desire",
    "jealousy_comparison",
  ],
  health: ["impermanence_mortality", "control_of_mind", "equanimity"],
  finance: ["attachment_desire", "detachment", "success_ambition"],
  education: ["discipline_habit", "purpose_meaning"],
  travel: ["detachment", "courage"],
};

/** Human-readable area label for the reply-level context line (design 2A). */
export const AREA_CONTEXT_LABEL: Record<LifeArea, string> = {
  career: "career",
  marriage: "relationships",
  health: "wellbeing",
  finance: "resources",
  education: "learning",
  travel: "journeys",
};

export type ChartThemes = {
  /** Tags to pass to retrieveSlokas as a supporting signal. */
  tags: string[];
  /** Life areas that actually contributed, strongest first. */
  areas: LifeArea[];
  /**
   * Why these tags were selected — for the context line and for logging the
   * bridge contribution rate (TODOS G3). States CONTEXT, never causation.
   */
  rationale: Array<{ area: LifeArea; confidence: string; timing: string }>;
};

const EMPTY: ChartThemes = { tags: [], areas: [], rationale: [] };

const CONFIDENCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

/**
 * Maps a chart's blended verdicts to verse tags.
 *
 * Returns EMPTY (not null, not a throw) when the chart has nothing usable, so
 * every caller degrades to plain retrieval without a branch. That is what makes
 * the empty-chart-voice state structurally impossible in the UI: no themes ->
 * no epigraph -> no label to render blank.
 *
 * @param verdicts chart.verdicts.blended
 * @param maxAreas how many life areas may contribute (default 2 — more than
 *   that and the tag set becomes so broad it stops meaning anything)
 */
export function chartThemes(
  verdicts: BlendedVerdict[] | undefined | null,
  maxAreas = 2
): ChartThemes {
  if (!Array.isArray(verdicts) || verdicts.length === 0) return EMPTY;

  const ranked = [...verdicts]
    .filter((v) => v && v.lifeArea && v.lifeArea in LIFE_AREA_TAGS)
    .sort(
      (a, b) =>
        (CONFIDENCE_RANK[b.confidence] ?? 0) -
        (CONFIDENCE_RANK[a.confidence] ?? 0)
    )
    .slice(0, maxAreas);

  if (ranked.length === 0) return EMPTY;

  const tags: string[] = [];
  const areas: LifeArea[] = [];
  const rationale: ChartThemes["rationale"] = [];

  for (const v of ranked) {
    const area = v.lifeArea;
    areas.push(area);
    rationale.push({
      area,
      confidence: String(v.confidence ?? "low"),
      timing: String(v.timing ?? ""),
    });
    // Unknown areas cannot reach here (filtered above), so `?? []` is belt and
    // braces for a future LifeArea added to types without a mapping here.
    for (const t of LIFE_AREA_TAGS[area] ?? []) {
      if (!tags.includes(t)) tags.push(t);
    }
  }

  return { tags, areas, rationale };
}

/**
 * The reply-level context line (design decision 2A).
 *
 * Deliberately states WHAT WAS READ, never why a verse won. The per-citation
 * "matched because X" phrasing was cut because the retrieval math above makes
 * that claim false in the common case, and a confident false claim is worse for
 * trust than no claim at all.
 */
export function contextLine(themes: ChartThemes): string | null {
  if (themes.areas.length === 0) return null;
  const labels = themes.areas.map((a) => AREA_CONTEXT_LABEL[a] ?? a);
  return `Read alongside your chart · ${labels.join(", ")}`;
}
