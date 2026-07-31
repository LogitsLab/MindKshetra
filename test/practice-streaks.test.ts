import { describe, it, expect } from "vitest";
import {
  advanceStreak,
  dayDiff,
  type StreakState,
} from "@/lib/practice-streaks";

const empty: StreakState = {
  current: 0,
  longest: 0,
  lastDay: null,
  graceUsedOn: null,
};

function run(days: string[], from: StreakState = empty) {
  return days.reduce((state, day) => advanceStreak(state, day), {
    ...from,
    changed: false,
    graceConsumed: false,
  });
}

describe("advanceStreak", () => {
  it("starts at 1 on the first day", () => {
    const s = advanceStreak(empty, "2026-07-01");
    expect(s).toMatchObject({ current: 1, longest: 1, lastDay: "2026-07-01" });
  });

  it("is idempotent within a day", () => {
    const s1 = advanceStreak(empty, "2026-07-01");
    const s2 = advanceStreak(s1, "2026-07-01");
    expect(s2.changed).toBe(false);
    expect(s2.current).toBe(1);
  });

  it("increments on consecutive days", () => {
    const s = run(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it("consumes grace for a single missed day (migration 010 mechanic)", () => {
    const s = run(["2026-07-01", "2026-07-02"]);
    const after = advanceStreak(s, "2026-07-04"); // missed the 3rd
    expect(after.current).toBe(3);
    expect(after.graceConsumed).toBe(true);
    expect(after.graceUsedOn).toBe("2026-07-04");
  });

  it("does not grant a second grace within the same rolling week", () => {
    const s = run(["2026-07-01", "2026-07-02"]);
    const graced = advanceStreak(s, "2026-07-04"); // grace #1
    const kept = advanceStreak(graced, "2026-07-05");
    const again = advanceStreak(kept, "2026-07-07"); // missed the 6th, too soon
    expect(again.current).toBe(1);
    expect(again.graceConsumed).toBe(false);
  });

  it("grants grace again after the cooldown", () => {
    const s = run([
      "2026-07-01",
      "2026-07-02",
      // grace on the 4th (missed the 3rd)
    ]);
    let state = advanceStreak(s, "2026-07-04");
    for (const day of [
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
    ]) {
      state = advanceStreak(state, day);
    }
    // 2026-07-11 missed; 2026-07-12 is 8 days after the last grace.
    const after = advanceStreak(state, "2026-07-12");
    expect(after.graceConsumed).toBe(true);
    expect(after.current).toBe(state.current + 1);
  });

  it("resets on a gap of three or more days", () => {
    const s = run(["2026-07-01", "2026-07-02"]);
    const after = advanceStreak(s, "2026-07-06");
    expect(after.current).toBe(1);
    expect(after.longest).toBe(2);
  });

  it("treats clock skew (negative diff) as already recorded", () => {
    const s = run(["2026-07-02"]);
    const after = advanceStreak(s, "2026-07-01");
    expect(after.changed).toBe(false);
    expect(after.current).toBe(1);
  });
});

describe("dayDiff", () => {
  it("crosses month boundaries exactly", () => {
    expect(dayDiff("2026-07-31", "2026-08-01")).toBe(1);
    expect(dayDiff("2026-07-01", "2026-07-31")).toBe(30);
  });
});
