import { describe, it, expect } from "vitest";
import {
  LIFE_AREA_TAGS,
  chartThemes,
  contextLine,
} from "@/lib/bridge/chart-to-verse";
import type { BlendedVerdict } from "@/lib/astrology/types";
import slokas from "@/data/slokas.json";

const verdict = (
  lifeArea: string,
  confidence: string,
  timing = "now"
): BlendedVerdict =>
  ({ lifeArea, confidence, timing, strengths: [] } as unknown as BlendedVerdict);

describe("chart -> verse bridge", () => {
  /**
   * The mapping is worthless if it points at tags no verse carries — retrieval
   * would silently return nothing extra and the bridge would look "subtle"
   * rather than broken.
   */
  it("only maps to tags that actually exist in the corpus", () => {
    const corpusTags = new Set<string>();
    for (const s of slokas as Array<{ tags?: string[] }>) {
      for (const t of s.tags ?? []) corpusTags.add(t);
    }
    const mapped = Object.values(LIFE_AREA_TAGS).flat();
    const missing = mapped.filter((t) => !corpusTags.has(t));
    expect(missing).toEqual([]);
  });

  it("covers all six life areas", () => {
    expect(Object.keys(LIFE_AREA_TAGS).sort()).toEqual([
      "career",
      "education",
      "finance",
      "health",
      "marriage",
      "travel",
    ]);
  });

  it("maps every area to at least two tags", () => {
    for (const [area, tags] of Object.entries(LIFE_AREA_TAGS)) {
      expect(tags.length, area).toBeGreaterThanOrEqual(2);
    }
  });

  // Empty must be a value, not a throw or a null — that is what makes the
  // empty-chart-voice UI state structurally impossible.
  it.each([[undefined], [null], [[]]])(
    "returns empty themes for %j without throwing",
    (v) => {
      expect(chartThemes(v as never)).toEqual({
        tags: [],
        areas: [],
        rationale: [],
      });
    }
  );

  it("ranks by confidence, strongest first", () => {
    const themes = chartThemes([
      verdict("travel", "low"),
      verdict("career", "high"),
      verdict("finance", "medium"),
    ]);
    expect(themes.areas).toEqual(["career", "finance"]);
  });

  it("caps contributing areas so the tag set stays meaningful", () => {
    const themes = chartThemes(
      ["career", "marriage", "health", "finance", "education", "travel"].map(
        (a) => verdict(a, "high")
      )
    );
    expect(themes.areas.length).toBe(2);
  });

  it("honours an explicit maxAreas", () => {
    const themes = chartThemes(
      [verdict("career", "high"), verdict("health", "high")],
      1
    );
    expect(themes.areas).toEqual(["career"]);
  });

  it("dedupes tags shared by two areas", () => {
    // finance and travel both carry "detachment".
    const themes = chartThemes([
      verdict("finance", "high"),
      verdict("travel", "high"),
    ]);
    expect(new Set(themes.tags).size).toBe(themes.tags.length);
    expect(themes.tags).toContain("detachment");
  });

  it("ignores a life area with no mapping instead of emitting undefined", () => {
    const themes = chartThemes([
      verdict("nonsense", "high"),
      verdict("career", "low"),
    ]);
    expect(themes.areas).toEqual(["career"]);
    expect(themes.tags.every((t) => typeof t === "string")).toBe(true);
  });

  it("carries rationale for the context line and contribution logging", () => {
    const themes = chartThemes([verdict("career", "high", "until 2028")]);
    expect(themes.rationale).toEqual([
      { area: "career", confidence: "high", timing: "until 2028" },
    ]);
  });
});

describe("context line (des/D4)", () => {
  it("is null when the chart contributed nothing", () => {
    expect(contextLine(chartThemes([]))).toBeNull();
  });

  it("names the context without asserting causation", () => {
    const line = contextLine(chartThemes([verdict("career", "high")]))!;
    expect(line).toContain("career");
    // "matched because X" was cut: it claims the chart CAUSED the selection.
    expect(line.toLowerCase()).not.toContain("because");
    expect(line.toLowerCase()).not.toContain("matched");
  });

  it("lists multiple areas", () => {
    const line = contextLine(
      chartThemes([verdict("career", "high"), verdict("health", "medium")])
    )!;
    expect(line).toContain("career");
    expect(line).toContain("wellbeing");
  });
});
