import { describe, it, expect } from "vitest";
import {
  DEFAULT_TOTAL_VERSES,
  MALA_LADDER,
  PRACTICE_LADDER,
  VISIT_LADDER,
  milestonesFor,
  newlyCrossed,
  nextMilestone,
  type MilestoneStats,
} from "@/lib/milestones";

const keys = (stats: MilestoneStats) => milestonesFor(stats).map((m) => m.key);

describe("milestonesFor — thresholds", () => {
  it("earns nothing on empty stats", () => {
    expect(milestonesFor({})).toEqual([]);
  });

  it("holds the visit ladder at exactly 2/7/21/49/108", () => {
    expect(keys({ visitStreakDays: 1 })).toEqual([]);
    expect(keys({ visitStreakDays: 2 })).toEqual(["visit-2"]);
    expect(keys({ visitStreakDays: 6 })).toEqual(["visit-2"]);
    expect(keys({ visitStreakDays: 7 })).toEqual(["visit-2", "visit-7"]);
    expect(keys({ visitStreakDays: 108 })).toEqual(
      VISIT_LADDER.map((d) => `visit-${d}`)
    );
  });

  it("holds per-practice ladders at 7/21/108, independently per practice", () => {
    expect(keys({ practiceStreakDays: { flow: 6 } })).toEqual([]);
    expect(keys({ practiceStreakDays: { flow: 7 } })).toEqual([
      "practice-flow-7",
    ]);
    expect(keys({ practiceStreakDays: { flow: 21, japa: 7 } })).toEqual([
      "practice-flow-7",
      "practice-flow-21",
      "practice-japa-7",
    ]);
    expect(keys({ practiceStreakDays: { pranayama: 108 } })).toEqual(
      PRACTICE_LADDER.map((d) => `practice-pranayama-${d}`)
    );
  });

  it("counts lifetime malas from beads: 108 beads = first mala", () => {
    expect(keys({ japaLifetimeCount: 107 })).toEqual([]);
    expect(keys({ japaLifetimeCount: 108 })).toEqual(["japa-mala-1"]);
    expect(keys({ japaLifetimeCount: 11 * 108 })).toEqual([
      "japa-mala-1",
      "japa-mala-11",
    ]);
    expect(keys({ japaLifetimeCount: 108 * 108 })).toEqual(
      MALA_LADDER.map((m) => `japa-mala-${m}`)
    );
  });

  it("marks the first verse, 108 verses, and the whole corpus", () => {
    expect(keys({ versesRead: 0 })).toEqual([]);
    expect(keys({ versesRead: 1 })).toEqual(["reading-1"]);
    expect(keys({ versesRead: 108 })).toEqual(["reading-1", "reading-108"]);
    expect(keys({ versesRead: DEFAULT_TOTAL_VERSES })).toEqual([
      "reading-1",
      "reading-108",
      "reading-all",
    ]);
  });

  it("respects a custom corpus size for the whole-Gita mark", () => {
    expect(keys({ versesRead: 700, totalVerses: 701 })).not.toContain(
      "reading-all"
    );
    expect(keys({ versesRead: 701, totalVerses: 701 })).toContain(
      "reading-all"
    );
  });

  it("marks each completed chapter, sorted and de-duplicated", () => {
    expect(keys({ chaptersCompleted: [12, 3, 3] })).toEqual([
      "chapter-3",
      "chapter-12",
    ]);
  });

  it("marks each completed path and names it by its title", () => {
    const stats: MilestoneStats = {
      pathsCompleted: [
        { id: "anger-7", titleEn: "Working with anger", titleHi: "क्रोध के साथ" },
      ],
    };
    const earned = milestonesFor(stats);
    expect(earned.map((m) => m.key)).toEqual(["path-anger-7"]);
    expect(earned[0].en.name).toContain("Working with anger");
    expect(earned[0].hi.name).toContain("क्रोध के साथ");
  });

  it("authors every mark in both languages, one line each", () => {
    const everything: MilestoneStats = {
      visitStreakDays: 108,
      practiceStreakDays: { flow: 108, japa: 108, sit: 108, pranayama: 108 },
      japaLifetimeCount: 108 * 108,
      versesRead: DEFAULT_TOTAL_VERSES,
      chaptersCompleted: Array.from({ length: 18 }, (_, i) => i + 1),
      pathsCompleted: [{ id: "anxiety-7", titleEn: "Anxiety", titleHi: "चिंता" }],
    };
    const earned = milestonesFor(everything);
    // 5 visit + 12 practice + 3 mala + 2 reading + 18 chapters + 1 whole + 1 path
    expect(earned).toHaveLength(42);
    for (const m of earned) {
      expect(m.en.name.length).toBeGreaterThan(0);
      expect(m.en.line.length).toBeGreaterThan(0);
      expect(m.hi.name.length).toBeGreaterThan(0);
      expect(m.hi.line.length).toBeGreaterThan(0);
    }
    // Keys are unique — the seen-set on the client depends on it.
    expect(new Set(earned.map((m) => m.key)).size).toBe(earned.length);
  });
});

describe("nextMilestone", () => {
  it("proposes the first return for a brand-new practice", () => {
    expect(nextMilestone({})?.key).toBe("visit-2");
  });

  it("proposes the proportionally nearest mark", () => {
    // 6/7 of a steady week beats 50/108 verses.
    const next = nextMilestone({ visitStreakDays: 6, versesRead: 50 });
    expect(next?.key).toBe("visit-7");
  });

  it("moves up its ladder once a step is earned", () => {
    expect(nextMilestone({ visitStreakDays: 7 })?.key).not.toBe("visit-7");
  });

  it("returns null when every proposable mark is earned", () => {
    expect(
      nextMilestone({
        visitStreakDays: 108,
        practiceStreakDays: { flow: 108, japa: 108, sit: 108, pranayama: 108 },
        japaLifetimeCount: 108 * 108,
        versesRead: DEFAULT_TOTAL_VERSES,
      })
    ).toBeNull();
  });
});

describe("newlyCrossed", () => {
  it("returns only the marks the after-stats added", () => {
    const before: MilestoneStats = { visitStreakDays: 6, versesRead: 10 };
    const after: MilestoneStats = { visitStreakDays: 7, versesRead: 10 };
    expect(newlyCrossed(before, after).map((m) => m.key)).toEqual(["visit-7"]);
  });

  it("returns nothing when nothing crossed", () => {
    const stats: MilestoneStats = { visitStreakDays: 9 };
    expect(newlyCrossed(stats, stats)).toEqual([]);
  });

  it("reports multiple crossings in canonical ladder order", () => {
    const before: MilestoneStats = {};
    const after: MilestoneStats = {
      visitStreakDays: 2,
      japaLifetimeCount: 108,
      versesRead: 1,
    };
    expect(newlyCrossed(before, after).map((m) => m.key)).toEqual([
      "visit-2",
      "japa-mala-1",
      "reading-1",
    ]);
  });

  it("never re-reports a mark that only moved deeper past its threshold", () => {
    const before: MilestoneStats = { practiceStreakDays: { japa: 8 } };
    const after: MilestoneStats = { practiceStreakDays: { japa: 9 } };
    expect(newlyCrossed(before, after)).toEqual([]);
  });
});
