import { describe, it, expect } from "vitest";
import {
  getEphemerisStatus,
  getEphemerisMode,
  calcPlanetLongitude,
  calcAyanamsa,
  utcPartsToJd,
} from "@/lib/astrology/swe";

/**
 * eng/E8 — first real coverage of the exact-math half.
 *
 * MODE MATTERS. Swiss and Moshier produce different numbers, so a fixture that
 * does not pin the mode silently passes under either engine. That is not
 * hypothetical: with `ephemeris/` hidden, the sun longitude for the fixture date
 * below came out IDENTICAL to the Swiss value (60.183), so the sun cannot serve
 * as the canary. The moon is used instead — it diverges between engines.
 *
 * These tests require ephemeris/*.se1 and the native sweph build. If Swiss is
 * unavailable the mode assertions fail loudly rather than skipping, because a
 * silently-degraded CI is exactly the failure eng/E13 is about.
 */
const FIXTURE = { y: 1990, mo: 6, d: 15, h: 6, mi: 30, s: 0 };

describe("ephemeris status", () => {
  it("reports Swiss when the .se1 files are present", () => {
    const st = getEphemerisStatus();
    expect(st.filesPresent).toBe(true);
    expect(st.mode).toBe("swiss");
    expect(st.reason).toBe("files-present");
  });

  it("agrees with the legacy getEphemerisMode()", () => {
    expect(getEphemerisMode()).toBe(getEphemerisStatus().mode);
  });

  it("resolves an ephemeris path", () => {
    expect(getEphemerisStatus().ephePath).toContain("ephemeris");
  });

  it("starts with a clean downgrade record", () => {
    const st = getEphemerisStatus();
    expect(st.consecutiveFailures).toBe(0);
    expect(st.lastDowngradeAt).toBeNull();
  });
});

describe("golden positions (mode-pinned)", () => {
  const { jdUt } = utcPartsToJd(
    FIXTURE.y,
    FIXTURE.mo,
    FIXTURE.d,
    FIXTURE.h,
    FIXTURE.mi,
    FIXTURE.s
  );

  it("computes a stable julian day", () => {
    expect(jdUt).toBeCloseTo(2448057.770833, 4);
  });

  it("sun longitude (NOTE: identical under both engines — not a canary)", () => {
    const { longitude } = calcPlanetLongitude(jdUt, "sun", "lahiri");
    expect(longitude).toBeCloseTo(60.1834, 3);
  });

  it("moon longitude — THE canary, diverges between Swiss and Moshier", () => {
    expect(getEphemerisStatus().mode).toBe("swiss");
    const { longitude } = calcPlanetLongitude(jdUt, "moon", "lahiri");
    expect(longitude).toBeGreaterThanOrEqual(0);
    expect(longitude).toBeLessThan(360);
    expect(longitude).toBeCloseTo(318.5785, 2);
  });

  it("saturn longitude", () => {
    const { longitude } = calcPlanetLongitude(jdUt, "saturn", "lahiri");
    expect(longitude).toBeGreaterThanOrEqual(0);
    expect(longitude).toBeLessThan(360);
  });

  it("lahiri ayanamsa is in the modern range", () => {
    const a = calcAyanamsa(jdUt, "lahiri");
    expect(a).toBeCloseTo(23.7237, 3);
  });

  it("krishnamurti ayanamsa differs from lahiri", () => {
    expect(calcAyanamsa(jdUt, "krishnamurti")).not.toBeCloseTo(
      calcAyanamsa(jdUt, "lahiri"),
      4
    );
  });

  it("normalises every longitude into [0, 360)", () => {
    for (const p of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const) {
      const { longitude } = calcPlanetLongitude(jdUt, p, "lahiri");
      expect(longitude, p).toBeGreaterThanOrEqual(0);
      expect(longitude, p).toBeLessThan(360);
    }
  });

  it("returns a speed for retrograde detection", () => {
    const { speed } = calcPlanetLongitude(jdUt, "saturn", "lahiri");
    expect(typeof speed).toBe("number");
    expect(Number.isFinite(speed)).toBe(true);
  });

  it("is deterministic across repeated calls", () => {
    const a = calcPlanetLongitude(jdUt, "moon", "lahiri").longitude;
    const b = calcPlanetLongitude(jdUt, "moon", "lahiri").longitude;
    expect(a).toBe(b);
  });

  it("did not degrade to Moshier during this run", () => {
    const st = getEphemerisStatus();
    expect(st.runtimeDowngrades).toBe(0);
    expect(st.mode).toBe("swiss");
  });
});
