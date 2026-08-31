import { describe, expect, it } from "vitest";
import { computeChart } from "@/lib/astrology/engine";
import { getEphemerisMode } from "@/lib/astrology/swe";
import { ENGINE_VERSION, type BirthInput } from "@/lib/astrology/types";
import {
  longitudeToDrekkana,
  longitudeToDwadasamsa,
  longitudeToSaptamsa,
} from "@/lib/astrology/vargas";

/**
 * Parasara D3/D7/D12 mapping plus a Swiss-Lahiri fixture so the new vargas
 * stay pinned to the same engine as D9/D10/KP.
 */

describe("divisional longitudes (Parasara)", () => {
  it("D3 drekkana: 10° parts, 1st = same, 2nd = 5th, 3rd = 9th", () => {
    expect(longitudeToDrekkana(0).signIndex).toBe(0); // Aries
    expect(longitudeToDrekkana(15).signIndex).toBe(4); // 2nd drekkana of Aries = Leo
    expect(longitudeToDrekkana(25).signIndex).toBe(8); // 3rd = Sagittarius
  });

  it("D7 saptamsa: odd signs from same, even from the 7th", () => {
    expect(longitudeToSaptamsa(0).signIndex).toBe(0); // Aries part 1
    // 15° Aries: 15 / (30/7) ≈ 3.5 → part 3 → Cancer
    expect(longitudeToSaptamsa(15).signIndex).toBe(3);
    // 0° Taurus (even sign) starts from Scorpio
    expect(longitudeToSaptamsa(30).signIndex).toBe(7);
  });

  it("D12 dwadasamsa: 2.5° parts counted from the occupied sign", () => {
    expect(longitudeToDwadasamsa(0).signIndex).toBe(0);
    expect(longitudeToDwadasamsa(2.5).signIndex).toBe(1);
    expect(longitudeToDwadasamsa(15).signIndex).toBe(6); // Libra
  });
});

const DELHI: BirthInput = {
  name: "Delhi noon",
  dob: "1990-06-15",
  tob: "12:00:00",
  tobUnknown: false,
  placeLabel: "New Delhi",
  lat: 28.6139,
  lng: 77.209,
  ianaTz: "Asia/Kolkata",
  utcOffsetMinutes: 330,
};

describe("chart payload vargas and KP (swiss)", () => {
  it("exposes D3/D7/D12, nakshatra lords, and KP cusps", () => {
    expect(getEphemerisMode()).toBe("swiss");
    expect(ENGINE_VERSION).toBe("2.2.0");

    const chart = computeChart(DELHI);
    expect(chart.engineVersion).toBe("2.2.0");
    expect(chart.ephemerisMode).toBe("swiss");
    expect(chart.vargas.d3?.planets.length).toBeGreaterThanOrEqual(9);
    expect(chart.vargas.d7?.planets.length).toBeGreaterThanOrEqual(9);
    expect(chart.vargas.d9?.planets.length).toBeGreaterThanOrEqual(9);
    expect(chart.vargas.d10?.planets.length).toBeGreaterThanOrEqual(9);
    expect(chart.vargas.d12?.planets.length).toBeGreaterThanOrEqual(9);
    expect(chart.kp?.cusps.length).toBe(12);
    expect(chart.dasha.tree.length).toBeGreaterThan(0);

    const moon = chart.planets.find((p) => p.id === "moon");
    expect(moon?.nakshatraLord).toBeTruthy();
    expect(chart.ascendant?.nakshatraLord).toBeTruthy();

    const d3Moon = chart.vargas.d3?.planets.find((p) => p.id === "moon");
    expect(d3Moon?.signIndex).toBe(longitudeToDrekkana(moon!.longitude).signIndex);
    const d7Moon = chart.vargas.d7?.planets.find((p) => p.id === "moon");
    expect(d7Moon?.signIndex).toBe(longitudeToSaptamsa(moon!.longitude).signIndex);
    const d12Moon = chart.vargas.d12?.planets.find((p) => p.id === "moon");
    expect(d12Moon?.signIndex).toBe(
      longitudeToDwadasamsa(moon!.longitude).signIndex
    );
  });
});
