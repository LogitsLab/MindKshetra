import { describe, it, expect } from "vitest";
import {
  daySeed,
  getTodaysNakshatra,
  getVerseOfTheDaySelection,
} from "@/lib/day-seed";
import { NAKSHATRA_TAGS } from "@/lib/nakshatra-tags";
import { NAKSHATRAS } from "@/lib/astrology/signs";
import { getSlokasByTags } from "@/lib/slokas";

describe("NAKSHATRA_TAGS", () => {
  it("covers all 27 nakshatras", () => {
    for (const nk of NAKSHATRAS) {
      expect(NAKSHATRA_TAGS[nk], `missing map entry for ${nk}`).toBeTruthy();
      expect(NAKSHATRA_TAGS[nk].length).toBeGreaterThan(0);
    }
  });

  it("every mapped tag resolves to a non-empty verse pool", async () => {
    for (const nk of NAKSHATRAS) {
      const pool = await getSlokasByTags(NAKSHATRA_TAGS[nk]);
      expect(pool.length, `${nk} pool is empty`).toBeGreaterThan(0);
    }
  });
});

describe("getTodaysNakshatra", () => {
  it("computes a stable nakshatra for a fixed instant", async () => {
    const now = new Date("2026-07-31T12:00:00Z");
    const a = await getTodaysNakshatra(now);
    const b = await getTodaysNakshatra(now);
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
    expect(NAKSHATRAS).toContain(a!.name);
  });

  it("uses the IST day, so the whole IST day shares one nakshatra", async () => {
    // 2026-07-31 00:30 IST and 2026-07-31 23:00 IST are the same IST day.
    const early = await getTodaysNakshatra(new Date("2026-07-30T19:00:00Z"));
    const late = await getTodaysNakshatra(new Date("2026-07-31T17:30:00Z"));
    expect(early).toEqual(late);
  });
});

describe("daySeed", () => {
  it("follows the IST day: one seed and one selection for the whole IST day", async () => {
    // 2026-07-30T19:30Z === 01:00 IST and 2026-07-31T10:00Z === 15:30 IST,
    // both on IST 2026-07-31. Before the IST fix the first instant used UTC
    // 07-30 and could serve yesterday's verse from a fresh lambda.
    const early = new Date("2026-07-30T19:30:00Z");
    const late = new Date("2026-07-31T10:00:00Z");
    expect(daySeed(early)).toBe(daySeed(late));

    const a = await getVerseOfTheDaySelection(early);
    const b = await getVerseOfTheDaySelection(late);
    expect(a).not.toBeNull();
    expect(a!.sloka.id).toBe(b!.sloka.id);
  });

  it("changes exactly at IST midnight, not UTC midnight", () => {
    // 17:00Z === 22:30 IST (still 07-31); 19:00Z === 00:30 IST on 08-01.
    expect(daySeed(new Date("2026-07-31T17:00:00Z"))).not.toBe(
      daySeed(new Date("2026-07-31T19:00:00Z"))
    );
  });
});

describe("getVerseOfTheDaySelection", () => {
  it("is deterministic and carries nakshatra provenance", async () => {
    const now = new Date("2026-07-31T12:00:00Z");
    const a = await getVerseOfTheDaySelection(now);
    const b = await getVerseOfTheDaySelection(now);
    expect(a).not.toBeNull();
    expect(a!.sloka.id).toBe(b!.sloka.id);
    // Engine present in tests, so the pick must be nakshatra-driven and the
    // verse must belong to that nakshatra's tag pool.
    expect(a!.nakshatra).toBeTruthy();
    const pool = await getSlokasByTags(
      NAKSHATRA_TAGS[a!.nakshatra!.name as keyof typeof NAKSHATRA_TAGS]
    );
    expect(pool.map((s) => s.id)).toContain(a!.sloka.id);
  });
});
