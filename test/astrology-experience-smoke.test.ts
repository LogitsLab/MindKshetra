import { describe, expect, it } from "vitest";
import { computeChart } from "@/lib/astrology/engine";
import { writePredictions } from "@/lib/astrology/predictions";
import type { BirthInput } from "@/lib/astrology/types";

/**
 * Library-level smoke for the revamp flows:
 * member-like + incognito-like charts → predictions → two sequential writes
 * (simulates regenerate / second chat-adjacent generation without hanging).
 */

const MEMBER_BIRTH: BirthInput = {
  name: "Member Smoke",
  dob: "1992-03-08",
  tob: "09:10",
  tobUnknown: false,
  placeLabel: "Pune, India",
  lat: 18.5204,
  lng: 73.8567,
  ianaTz: "Asia/Kolkata",
  utcOffsetMinutes: 330,
};

const INCOGNITO_BIRTH: BirthInput = {
  name: "Incognito Smoke",
  dob: "1988-09-12",
  tob: "18:40",
  tobUnknown: false,
  placeLabel: "Bengaluru, India",
  lat: 12.9716,
  lng: 77.5946,
  ianaTz: "Asia/Kolkata",
  utcOffsetMinutes: 330,
};

async function smokePredictions(birth: BirthInput) {
  const chart = computeChart(birth);
  expect(chart.overview.ascendantSign).toBeTruthy();
  expect(chart.overview.currentMaha?.lord).toBeTruthy();
  expect(chart.dasha?.tree?.length).toBeGreaterThan(0);

  const prev = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const first = await writePredictions(chart, "en");
    expect(first.source).toBe("rules");
    expect(first.portrait.length).toBeGreaterThan(20);
    expect(Object.keys(first.areas)).toHaveLength(6);

    const second = await writePredictions({ ...chart, predictionsText: first }, "en");
    expect(second.source).toBe("rules");
    expect(second.areas.career.headline).toBeTruthy();
    expect(second.areas.marriage.headline).not.toEqual(
      second.areas.career.headline
    );
    return { chart, first, second };
  } finally {
    if (prev !== undefined) process.env.GROQ_API_KEY = prev;
  }
}

describe("astrology experience smoke", () => {
  it("member-like cast → predictions → second generation", async () => {
    const { chart, first } = await smokePredictions(MEMBER_BIRTH);
    expect(chart.birth.name).toBe("Member Smoke");
    expect(first.language).toBe("en");
  });

  it("incognito-like cast → predictions → second generation", async () => {
    const { chart, second } = await smokePredictions(INCOGNITO_BIRTH);
    expect(chart.birth.name).toBe("Incognito Smoke");
    expect(second.generatedAt).toBeTruthy();
  });
});
