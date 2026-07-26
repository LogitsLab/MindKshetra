import { describe, it, expect } from "vitest";
import { computeCompatibility } from "@/lib/astrology/compatibility";
import type { ChartPayload } from "@/lib/astrology/types";

/**
 * ceo/T11 — Ashtakoota scoring.
 *
 * This has real cultural weight in India, which is why the tests care as much
 * about what it REFUSES to claim as about the arithmetic. A low score shown
 * bluntly can do harm to a real relationship.
 */
const chartWith = (nakshatraIndex: number, signIndex: number) =>
  ({
    planets: [{ id: "moon", nakshatraIndex, signIndex }],
  } as unknown as ChartPayload);

const noMoon = { planets: [{ id: "sun", signIndex: 0 }] } as unknown as ChartPayload;

describe("kundli milan", () => {
  it("scores out of 36 across eight kootas", () => {
    const r = computeCompatibility(chartWith(0, 0), chartWith(5, 3))!;
    expect(r.kootas).toHaveLength(8);
    expect(r.max).toBe(36);
    expect(r.kootas.reduce((s, k) => s + k.max, 0)).toBe(36);
  });

  it("never exceeds the maximum for any koota", () => {
    for (let a = 0; a < 27; a += 4) {
      for (let b = 0; b < 27; b += 5) {
        const r = computeCompatibility(chartWith(a, a % 12), chartWith(b, b % 12))!;
        for (const k of r.kootas) {
          expect(k.score, `${k.name} ${a}/${b}`).toBeGreaterThanOrEqual(0);
          expect(k.score, `${k.name} ${a}/${b}`).toBeLessThanOrEqual(k.max);
        }
        expect(r.total).toBeLessThanOrEqual(36);
        expect(r.total).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("gives an identical chart a high score", () => {
    const r = computeCompatibility(chartWith(7, 2), chartWith(7, 2))!;
    // Same nadi always scores 0, so a self-match can never reach 36 — which is
    // exactly the classical behaviour, not a bug.
    expect(r.total).toBeGreaterThan(20);
    expect(r.nadiDosha).toBe(true);
  });

  it("flags nadi dosha when both share a nadi", () => {
    const r = computeCompatibility(chartWith(0, 0), chartWith(3, 4))!;
    expect(r.nadiDosha).toBe(r.kootas.find((k) => k.name === "Nadi")!.score === 0);
  });

  it("explains that nadi exceptions are not modelled, rather than implying certainty", () => {
    const r = computeCompatibility(chartWith(0, 0), chartWith(3, 4))!;
    const nadi = r.kootas.find((k) => k.name === "Nadi")!;
    if (nadi.score === 0) {
      expect(nadi.note.toLowerCase()).toContain("exception");
    }
  });

  // Refusing to compute beats computing something misleading.
  it("returns null when a chart has no moon", () => {
    expect(computeCompatibility(noMoon, chartWith(1, 1))).toBeNull();
    expect(computeCompatibility(chartWith(1, 1), noMoon)).toBeNull();
  });

  it("always carries a caveat", () => {
    const r = computeCompatibility(chartWith(2, 2), chartWith(9, 6))!;
    expect(r.caveat).toBeTruthy();
    expect(r.caveat.toLowerCase()).toContain("not a prediction");
  });

  // The band language must never tell someone their relationship is doomed.
  it("never bands a pair as incompatible", () => {
    for (let a = 0; a < 27; a += 3) {
      const r = computeCompatibility(chartWith(a, a % 12), chartWith((a + 13) % 27, (a + 5) % 12))!;
      expect(["excellent", "good", "acceptable", "needs-discussion"]).toContain(r.band);
      expect(r.band).not.toBe("incompatible");
    }
  });

  it("is symmetric enough to be trustworthy on the headline number", () => {
    const ab = computeCompatibility(chartWith(4, 1), chartWith(16, 8))!;
    const ba = computeCompatibility(chartWith(16, 8), chartWith(4, 1))!;
    // Varna and Bhakoot are directional by tradition, so allow a small delta —
    // but the two orderings must not tell wildly different stories.
    expect(Math.abs(ab.total - ba.total)).toBeLessThanOrEqual(8);
  });

  it("handles out-of-range nakshatra indices without crashing", () => {
    expect(computeCompatibility(chartWith(99, 0), chartWith(-4, 3))).not.toBeNull();
  });
});
