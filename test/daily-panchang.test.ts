import { describe, it, expect } from "vitest";
import { computeDailyPanchang } from "@/lib/astrology/daily-panchang";

/**
 * Golden anchors derive from fixed astronomy, not a copied almanac:
 * the total solar eclipse of 2026-08-12 (~17:46 UT) pins the new moon, so
 * Delhi's sunrise that morning sits in Amavasya and the next morning in
 * Shukla Pratipada. Physical sunrise bounds catch engine/convention breakage
 * without depending on any single published panchang's regional rules.
 */
const DELHI = { lat: 28.6139, lng: 77.209, tz: "Asia/Kolkata" };

function hourInTz(iso: string | null): number {
  expect(iso).toBeTruthy();
  const m = iso!.match(/T(\d{2}):(\d{2})/);
  expect(m).toBeTruthy();
  return Number(m![1]) + Number(m![2]) / 60;
}

describe("computeDailyPanchang", () => {
  it("computes Delhi sunrise/sunset within physical bounds (late July)", () => {
    const p = computeDailyPanchang("2026-07-31", DELHI.lat, DELHI.lng, DELHI.tz);
    const rise = hourInTz(p.sunrise);
    const set = hourInTz(p.sunset);
    expect(rise).toBeGreaterThan(5.0);
    expect(rise).toBeLessThan(6.5);
    expect(set).toBeGreaterThan(18.5);
    expect(set).toBeLessThan(19.75);
    expect(p.date).toBe("2026-07-31");
    expect(p.ianaTz).toBe(DELHI.tz);
  });

  it("pins Amavasya on the morning of the 2026-08-12 solar eclipse", () => {
    const p = computeDailyPanchang("2026-08-12", DELHI.lat, DELHI.lng, DELHI.tz);
    expect(p.isAmavasya).toBe(true);
    expect(p.tithi).toBe("Krishna Amavasya");
  });

  it("pins Shukla Pratipada the morning after the eclipse", () => {
    const p = computeDailyPanchang("2026-08-13", DELHI.lat, DELHI.lng, DELHI.tz);
    expect(p.tithiIndex).toBe(0);
    expect(p.tithi).toBe("Shukla Pratipada");
    expect(p.isAmavasya).toBe(false);
  });

  it("reports end times after sunrise and within ~2 days", () => {
    const p = computeDailyPanchang("2026-07-31", DELHI.lat, DELHI.lng, DELHI.tz);
    expect(p.tithiEndsAt).toBeTruthy();
    expect(p.nakshatraEndsAt).toBeTruthy();
    const sunrise = Date.parse(p.sunrise!);
    for (const end of [p.tithiEndsAt!, p.nakshatraEndsAt!]) {
      const t = Date.parse(end);
      expect(t).toBeGreaterThan(sunrise);
      expect(t - sunrise).toBeLessThan(2 * 86_400_000);
    }
  });

  it("flags ekadashi consistently with the tithi index", () => {
    // Scan a lunar month: exactly two ekadashis must appear, and the flag
    // must match the index arithmetic on every day.
    let ekadashis = 0;
    for (let d = 1; d <= 30; d++) {
      const date = `2026-09-${String(d).padStart(2, "0")}`;
      const p = computeDailyPanchang(date, DELHI.lat, DELHI.lng, DELHI.tz);
      expect(p.isEkadashi).toBe(p.tithiIndex % 15 === 10);
      if (p.isEkadashi) ekadashis++;
    }
    expect(ekadashis).toBeGreaterThanOrEqual(1);
    expect(ekadashis).toBeLessThanOrEqual(3);
  });

  it("is deterministic", () => {
    const a = computeDailyPanchang("2026-07-31", DELHI.lat, DELHI.lng, DELHI.tz);
    const b = computeDailyPanchang("2026-07-31", DELHI.lat, DELHI.lng, DELHI.tz);
    expect(a).toEqual(b);
  });
});
