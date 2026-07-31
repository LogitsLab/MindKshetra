import { describe, it, expect } from "vitest";
import { isValidTimezone, localDayString } from "@/lib/streaks";
import { daySeed } from "@/lib/day-seed";

/**
 * Migration 010 — the streak day boundary is the user's local midnight, not
 * UTC. Before this, an IST reader opening the app at 00:30 was credited to
 * the previous day (UTC was still 19:00 yesterday).
 */
describe("localDayString", () => {
  it("credits an IST 00:30 visit to the local day, not the UTC day", () => {
    // 2026-07-31 00:30 IST === 2026-07-30 19:00 UTC
    const now = new Date("2026-07-30T19:00:00Z");
    expect(localDayString("Asia/Kolkata", now)).toBe("2026-07-31");
    expect(now.toISOString().slice(0, 10)).toBe("2026-07-30");
  });

  it("handles a western timezone on the other side of UTC midnight", () => {
    // 2026-07-30 21:00 in Los Angeles === 2026-07-31 04:00 UTC
    const now = new Date("2026-07-31T04:00:00Z");
    expect(localDayString("America/Los_Angeles", now)).toBe("2026-07-30");
  });

  it("returns ISO YYYY-MM-DD shape", () => {
    expect(localDayString("Asia/Kolkata")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isValidTimezone", () => {
  it("accepts real IANA zones", () => {
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidTimezone("Asia/Nowhere")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone(null)).toBe(false);
    expect(isValidTimezone(42)).toBe(false);
  });
});

/**
 * A-0.5 — one canonical seed. Three separate implementations previously
 * existed and home used a different formula (id-keyed instead of
 * index-keyed), so surfaces could disagree.
 */
describe("daySeed", () => {
  it("is stable within a UTC day", () => {
    expect(daySeed(new Date("2026-07-31T00:00:01Z"))).toBe(
      daySeed(new Date("2026-07-31T23:59:59Z"))
    );
  });

  it("increments across days", () => {
    expect(daySeed(new Date("2026-08-01T12:00:00Z"))).toBe(
      daySeed(new Date("2026-07-31T12:00:00Z")) + 1
    );
  });
});
