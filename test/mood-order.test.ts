import { describe, it, expect } from "vitest";
import { orderMoods } from "@/lib/mood-order";
import { moods } from "@/lib/moods-data";
import type { BlendedVerdict } from "@/lib/astrology/types";

function verdict(partial: Partial<BlendedVerdict>): BlendedVerdict {
  return {
    lifeArea: "career",
    theme: "",
    timing: "",
    confidence: "medium",
    notes: [],
    strengths: [],
    tensions: [],
    narrativeBullets: [],
    dashaSupports: true,
    mahaLord: null,
    antarLord: null,
    mahaWindow: null,
    antarWindow: null,
    ...partial,
  };
}

describe("orderMoods", () => {
  it("keeps the default order when nothing is under tension", () => {
    const { order } = orderMoods([verdict({ tensions: [] })]);
    expect(order).toEqual(moods.map((m) => m.id));
  });

  it("floats career moods when career is under pressure", () => {
    const { order, basis } = orderMoods([
      verdict({
        lifeArea: "career",
        confidence: "high",
        tensions: ["Saturn in house 10"],
        dashaSupports: false,
      }),
    ]);
    expect(order.slice(0, 3).sort()).toEqual(
      ["unmotivated", "failure", "big-decision"].sort()
    );
    expect(basis[0].lifeArea).toBe("career");
  });

  it("every mapped mood id exists in the catalog", () => {
    const known = new Set(moods.map((m) => m.id));
    const { order } = orderMoods([
      verdict({ lifeArea: "marriage", tensions: ["x"] }),
      verdict({ lifeArea: "health", tensions: ["x"] }),
      verdict({ lifeArea: "finance", tensions: ["x"] }),
      verdict({ lifeArea: "education", tensions: ["x"] }),
      verdict({ lifeArea: "travel", tensions: ["x"] }),
      verdict({ lifeArea: "career", tensions: ["x"] }),
    ]);
    // The order is a permutation of the catalog — nothing invented or lost.
    expect([...order].sort()).toEqual(Array.from(known).sort());
    expect(order).toHaveLength(moods.length);
  });

  it("is a stable sort — untouched moods keep their relative order", () => {
    const { order } = orderMoods([
      verdict({ lifeArea: "travel", tensions: ["x"], confidence: "low" }),
    ]);
    const untouched = order.filter(
      (id) => !["fearful", "hopeful"].includes(id)
    );
    const original = moods
      .map((m) => m.id)
      .filter((id) => !["fearful", "hopeful"].includes(id));
    expect(untouched).toEqual(original);
  });
});
