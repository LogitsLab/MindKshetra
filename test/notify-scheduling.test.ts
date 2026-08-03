import { describe, expect, it } from "vitest";
import {
  dailyVerseDedupeKey,
  isDueAtLocalHour,
  localDayInTz,
  localHourInTz,
  resolveTimezone,
} from "@/lib/notifications/scheduling";

describe("resolveTimezone", () => {
  it("keeps valid IANA zones", () => {
    expect(resolveTimezone("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(resolveTimezone("America/New_York")).toBe("America/New_York");
    expect(resolveTimezone("UTC")).toBe("UTC");
  });

  it("falls back to IST for junk", () => {
    expect(resolveTimezone(null)).toBe("Asia/Kolkata");
    expect(resolveTimezone(undefined)).toBe("Asia/Kolkata");
    expect(resolveTimezone("")).toBe("Asia/Kolkata");
    expect(resolveTimezone("Middle/Nowhere")).toBe("Asia/Kolkata");
    expect(resolveTimezone(42)).toBe("Asia/Kolkata");
  });
});

describe("isDueAtLocalHour", () => {
  it("matches 08:00 IST (02:30 UTC)", () => {
    const now = new Date("2026-08-03T02:30:00Z");
    expect(localHourInTz("Asia/Kolkata", now)).toBe(8);
    expect(isDueAtLocalHour("Asia/Kolkata", now, 8)).toBe(true);
    expect(isDueAtLocalHour("Asia/Kolkata", now, 9)).toBe(false);
  });

  it("half-hour ticks inside the same local hour both match", () => {
    // Dispatcher runs ~every 30 min; the dedupe key collapses the pair.
    expect(
      isDueAtLocalHour("Asia/Kolkata", new Date("2026-08-03T02:35:00Z"), 8)
    ).toBe(true);
    expect(
      isDueAtLocalHour("Asia/Kolkata", new Date("2026-08-03T03:05:00Z"), 8)
    ).toBe(true);
    expect(
      isDueAtLocalHour("Asia/Kolkata", new Date("2026-08-03T03:35:00Z"), 8)
    ).toBe(false);
  });

  it("matches UTC exactly", () => {
    expect(isDueAtLocalHour("UTC", new Date("2026-08-03T08:00:00Z"), 8)).toBe(
      true
    );
    expect(isDueAtLocalHour("UTC", new Date("2026-08-03T07:59:00Z"), 8)).toBe(
      false
    );
  });

  it("tracks the DST shift in America/New_York", () => {
    // Winter (EST, UTC-5): 8am local == 13:00 UTC.
    expect(
      isDueAtLocalHour("America/New_York", new Date("2026-01-15T13:00:00Z"), 8)
    ).toBe(true);
    // Summer (EDT, UTC-4): 8am local == 12:00 UTC.
    expect(
      isDueAtLocalHour("America/New_York", new Date("2026-07-15T12:00:00Z"), 8)
    ).toBe(true);
    // Winter instant with the summer offset must NOT match.
    expect(
      isDueAtLocalHour("America/New_York", new Date("2026-01-15T12:00:00Z"), 8)
    ).toBe(false);
  });

  it("handles the DST spring-forward boundary day", () => {
    // US DST begins 2026-03-08 at 02:00 local. 8am EDT == 12:00 UTC that day.
    const springForward = new Date("2026-03-08T12:00:00Z");
    expect(isDueAtLocalHour("America/New_York", springForward, 8)).toBe(true);
    // 13:00 UTC would be 8am under winter (EST) math, but the clocks have
    // sprung forward: it is 9am EDT — no match at hour 8.
    expect(
      isDueAtLocalHour("America/New_York", new Date("2026-03-08T13:00:00Z"), 8)
    ).toBe(false);
  });

  it("falls back to IST for invalid zones", () => {
    const now = new Date("2026-08-03T02:30:00Z"); // 08:00 IST
    expect(isDueAtLocalHour("Not/AZone", now, 8)).toBe(true);
    expect(isDueAtLocalHour(null, now, 8)).toBe(true);
  });
});

describe("dailyVerseDedupeKey", () => {
  it("uses the LOCAL calendar day, not UTC", () => {
    // 20:00 UTC Aug 2 is already Aug 3 in IST (+05:30).
    const now = new Date("2026-08-02T20:00:00Z");
    expect(localDayInTz("Asia/Kolkata", now)).toBe("2026-08-03");
    expect(dailyVerseDedupeKey("Asia/Kolkata", now)).toBe(
      "daily-verse:2026-08-03"
    );
    expect(dailyVerseDedupeKey("UTC", now)).toBe("daily-verse:2026-08-02");
  });

  it("is stable across ticks within one local day", () => {
    expect(
      dailyVerseDedupeKey("Asia/Kolkata", new Date("2026-08-03T02:30:00Z"))
    ).toBe(
      dailyVerseDedupeKey("Asia/Kolkata", new Date("2026-08-03T03:05:00Z"))
    );
  });

  it("falls back to IST for invalid zones", () => {
    const now = new Date("2026-08-02T20:00:00Z");
    expect(dailyVerseDedupeKey("Bad/Zone", now)).toBe(
      "daily-verse:2026-08-03"
    );
  });
});
