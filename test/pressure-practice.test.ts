import { describe, it, expect } from "vitest";
import {
  PP_ACTION_POOL_SIZE,
  pickVerseIndex,
  pressureBasis,
} from "@/lib/bridge/pressure-practice";
import { LIFE_AREA_TAGS } from "@/lib/bridge/chart-to-verse";
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

describe("pressureBasis", () => {
  it("returns null when no verdict carries tension — a quiet chart gets no card", () => {
    expect(pressureBasis([], 100)).toBeNull();
    expect(pressureBasis(null, 100)).toBeNull();
    expect(
      pressureBasis([verdict({ tensions: [], theme: "Calm seas" })], 100)
    ).toBeNull();
  });

  it("picks the area with the most tension weight, not the highest confidence", () => {
    const basis = pressureBasis(
      [
        verdict({
          lifeArea: "career",
          confidence: "high",
          tensions: ["Saturn presses the 10th"],
        }),
        verdict({
          lifeArea: "marriage",
          confidence: "medium",
          tensions: ["Mars afflicts the 7th", "Rahu in the 7th"],
        }),
      ],
      0
    );
    // career: 1×3 = 3; marriage: 2×2 = 4 → marriage presses harder.
    expect(basis?.area).toBe("marriage");
    expect(basis?.fact).toBe("Mars afflicts the 7th");
    expect(basis?.tags).toEqual(LIFE_AREA_TAGS.marriage);
  });

  it("keeps the earlier verdict on exact ties (stable across renders)", () => {
    const basis = pressureBasis(
      [
        verdict({ lifeArea: "health", tensions: ["Moon under stress"] }),
        verdict({ lifeArea: "finance", tensions: ["Second lord debilitated"] }),
      ],
      5
    );
    expect(basis?.area).toBe("health");
  });

  it("prefers the dasha window over generic timing for the timing line", () => {
    const withWindow = pressureBasis(
      [
        verdict({
          tensions: ["x"],
          mahaWindow: "2024–2043 Saturn",
          timing: "generic note",
        }),
      ],
      0
    );
    expect(withWindow?.timing).toBe("2024–2043 Saturn");
    const withoutWindow = pressureBasis(
      [verdict({ tensions: ["x"], mahaWindow: null, timing: "generic note" })],
      0
    );
    expect(withoutWindow?.timing).toBe("generic note");
  });

  it("rotates the action daily and stays inside the authored pool", () => {
    const verdicts = [verdict({ tensions: ["x"] })];
    const seen = new Set<number>();
    for (let day = 0; day < PP_ACTION_POOL_SIZE * 2; day++) {
      const basis = pressureBasis(verdicts, day);
      expect(basis?.actionIndex).toBe(day % PP_ACTION_POOL_SIZE);
      seen.add(basis!.actionIndex);
    }
    expect(seen.size).toBe(PP_ACTION_POOL_SIZE);
  });
});

describe("pickVerseIndex", () => {
  it("is deterministic per day and wraps the match count", () => {
    expect(pickVerseIndex(7, 20653)).toBe(20653 % 7);
    expect(pickVerseIndex(7, 20654)).toBe(20654 % 7);
    expect(pickVerseIndex(0, 20653)).toBe(0);
    expect(pickVerseIndex(3, Number.NaN)).toBe(0);
  });
});
