import { describe, it, expect } from "vitest";
import { computeMonthPanchang } from "@/lib/astrology/festivals";

const DELHI = { lat: 28.6139, lng: 77.209, tz: "Asia/Kolkata" };

describe("computeMonthPanchang", () => {
  it("finds Makara Sankranti in January 2026 on the traditional date", () => {
    const cal = computeMonthPanchang("2026-01", DELHI.lat, DELHI.lng, DELHI.tz);
    const sankranti = cal.observances.filter((o) => o.kind === "sankranti");
    expect(sankranti).toHaveLength(1);
    expect(sankranti[0].label).toBe("Makara Sankranti");
    // Sidereal Capricorn ingress lands Jan 14/15 (the sunrise after ingress).
    expect(["2026-01-14", "2026-01-15"]).toContain(sankranti[0].date);
  }, 30_000);

  it("finds a sane count of lunar observances in a month", () => {
    const cal = computeMonthPanchang("2026-09", DELHI.lat, DELHI.lng, DELHI.tz);
    const kinds = (kind: string) =>
      cal.observances.filter((o) => o.kind === kind);
    expect(kinds("ekadashi").length).toBeGreaterThanOrEqual(1);
    expect(kinds("ekadashi").length).toBeLessThanOrEqual(3);
    expect(kinds("purnima").length).toBeGreaterThanOrEqual(1);
    expect(kinds("purnima").length).toBeLessThanOrEqual(2);
    expect(kinds("amavasya").length).toBeGreaterThanOrEqual(1);
    expect(kinds("amavasya").length).toBeLessThanOrEqual(2);
    expect(cal.days).toHaveLength(30);
  }, 30_000);

  it("pins the eclipse Amavasya of 2026-08-12 in the month view", () => {
    const cal = computeMonthPanchang("2026-08", DELHI.lat, DELHI.lng, DELHI.tz);
    const amavasya = cal.observances.find(
      (o) => o.kind === "amavasya" && o.date === "2026-08-12"
    );
    expect(amavasya).toBeTruthy();
  }, 30_000);
});
