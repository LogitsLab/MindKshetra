import { describe, it, expect } from "vitest";
import {
  milestoneJustHit,
  sittingSectionForDay,
  SITTING_COURSE_ID,
  SITTING_MILESTONES,
} from "@/lib/meditation-core";

describe("sitting course milestones", () => {
  it("hits only exact milestone days when the prefix is complete", () => {
    expect(milestoneJustHit([1, 2, 3, 4, 5, 6, 7], 7)).toBe(7);
    expect(milestoneJustHit([1, 2, 3, 4, 5, 6], 7)).toBe(7);
    expect(milestoneJustHit([1, 2, 3, 4, 5, 6], 6)).toBe(null);
    expect(milestoneJustHit(Array.from({ length: 21 }, (_, i) => i + 1), 21)).toBe(
      21
    );
    expect(milestoneJustHit(Array.from({ length: 45 }, (_, i) => i + 1), 45)).toBe(
      45
    );
  });

  it("sections map foundation / habit / deepening", () => {
    expect(sittingSectionForDay(1).id).toBe("foundation");
    expect(sittingSectionForDay(7).id).toBe("foundation");
    expect(sittingSectionForDay(8).id).toBe("habit");
    expect(sittingSectionForDay(21).id).toBe("habit");
    expect(sittingSectionForDay(22).id).toBe("deepening");
    expect(sittingSectionForDay(45).id).toBe("deepening");
  });

  it("exports the composed course id and milestones", () => {
    expect(SITTING_COURSE_ID).toBe("sitting-course");
    expect([...SITTING_MILESTONES]).toEqual([7, 21, 45]);
  });
});
