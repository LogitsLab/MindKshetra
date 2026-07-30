import { describe, expect, it } from "vitest";
import { computeChart } from "@/lib/astrology/engine";
import { nearTermWindow } from "@/lib/astrology/dasha";
import {
  buildAreaAnchors,
  buildPredictionFacts,
  writePredictions,
} from "@/lib/astrology/predictions";
import { LIFE_AREAS } from "@/lib/astrology/blend";

/**
 * Prediction write-up quality gates — anchors must be chart-specific,
 * near-term must be dasha-aware when possible, and banlist filler must not
 * dominate fallback prose.
 */

const BIRTHS = [
  {
    name: "Eval Delhi",
    dob: "1990-06-15",
    tob: "06:30",
    tobUnknown: false,
    placeLabel: "Delhi, India",
    lat: 28.6139,
    lng: 77.209,
    ianaTz: "Asia/Kolkata",
    utcOffsetMinutes: 330,
  },
  {
    name: "Eval Mumbai",
    dob: "1985-01-20",
    tob: "14:15",
    tobUnknown: false,
    placeLabel: "Mumbai, India",
    lat: 19.076,
    lng: 72.8777,
    ianaTz: "Asia/Kolkata",
    utcOffsetMinutes: 330,
  },
  {
    name: "Eval Chennai",
    dob: "2000-11-03",
    tob: "22:45",
    tobUnknown: false,
    placeLabel: "Chennai, India",
    lat: 13.0827,
    lng: 80.2707,
    ianaTz: "Asia/Kolkata",
    utcOffsetMinutes: 330,
  },
] as const;

const BIRTH = BIRTHS[0];

const FILLER =
  /stars align|cosmic energy|embrace the journey|trust the process|changes are coming|interesting period/i;

describe("prediction facts + near-term window", () => {
  const chart = computeChart(BIRTH);

  it("builds enriched facts with degrees, aspects, and dasha upcoming", () => {
    const facts = buildPredictionFacts(chart);
    expect(facts.keyPlanets.length).toBeGreaterThanOrEqual(5);
    expect(facts.keyPlanets.some((p) => p.degreeInSign != null)).toBe(true);
    expect(facts.dashaNow.maha?.lord).toBeTruthy();
    expect(facts.nearTermWindow.start).toBeTruthy();
    expect(facts.nearTermWindow.end).toBeTruthy();
    expect(["antar", "pratyantar", "calendar"]).toContain(
      facts.nearTermWindow.basis
    );
    expect(facts.areas).toHaveLength(LIFE_AREAS.length);
    for (const area of facts.areas) {
      expect(area.mustCite.length).toBeGreaterThan(0);
      expect(area.factAnchors).toBeTruthy();
    }
  });

  it("uses dasha-aware nearTerm when antar is present", () => {
    const window = nearTermWindow(chart.asOfDate, chart);
    if (chart.overview.currentAntar?.end) {
      expect(window.basis === "antar" || window.basis === "pratyantar").toBe(
        true
      );
      expect(window.end <= (chart.overview.currentAntar.end as string)).toBe(
        true
      );
    }
  });

  it("area anchors cite houses or dasha for career", () => {
    const anchors = buildAreaAnchors(chart, "career");
    expect(anchors.length).toBeGreaterThan(0);
    const blob = anchors.join(" ");
    expect(/House|dasha|Dashamsa|Jupiter|Saturn|Sun|Mercury/i.test(blob)).toBe(
      true
    );
  });

  it("golden charts produce distinct dasha / ascendant fingerprints", () => {
    const fingerprints = BIRTHS.map((b) => {
      const c = computeChart(b);
      const facts = buildPredictionFacts(c);
      return [
        facts.snapshot.ascendant,
        facts.snapshot.moon,
        facts.dashaNow.maha?.lord,
        facts.dashaNow.antar?.lord,
        facts.nearTermWindow.end,
      ].join("|");
    });
    expect(new Set(fingerprints).size).toBe(BIRTHS.length);
    for (const b of BIRTHS) {
      const facts = buildPredictionFacts(computeChart(b));
      expect(facts.areas.every((a) => a.mustCite.length > 0)).toBe(true);
      expect(
        facts.areas.every(
          (a) =>
            a.factAnchors &&
            (a.factAnchors.houses.length > 0 ||
              a.factAnchors.mahaLord != null ||
              a.factAnchors.strengthIds.length > 0)
        )
      ).toBe(true);
    }
  });
});

describe("fallback prediction quality (rules source)", () => {
  it("returns source=rules without GROQ and avoids banlist filler", async () => {
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      const chart = computeChart(BIRTH);
      const text = await writePredictions(chart, "en");
      expect(text.source).toBe("rules");
      expect(text.portrait.length).toBeGreaterThan(40);
      expect(FILLER.test(text.portrait)).toBe(false);
      const careers = text.areas.career;
      expect(careers.headline.length).toBeGreaterThan(3);
      expect(careers.overview.length).toBeGreaterThan(20);
      expect(FILLER.test(careers.overview)).toBe(false);
      // Distinctness: not every area shares an identical overview.
      const overviews = LIFE_AREAS.map((a) => text.areas[a].overview);
      const unique = new Set(overviews);
      expect(unique.size).toBeGreaterThan(1);
    } finally {
      if (prev !== undefined) process.env.GROQ_API_KEY = prev;
    }
  });

  it("Hindi fallback still emits all six areas", async () => {
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      const chart = computeChart(BIRTH);
      const text = await writePredictions(chart, "hi");
      expect(text.language).toBe("hi");
      expect(text.source).toBe("rules");
      for (const area of LIFE_AREAS) {
        expect(text.areas[area].headline.length).toBeGreaterThan(0);
      }
    } finally {
      if (prev !== undefined) process.env.GROQ_API_KEY = prev;
    }
  });
});
