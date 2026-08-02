import { describe, it, expect } from "vitest";
import {
  MERGE_CAP,
  foldStreakDays,
  sanitizeGuestSessions,
} from "@/lib/sadhana-core";

const TODAY = "2026-08-01";
const REF = "123e4567-e89b-42d3-a456-426614174000";

function session(partial: Record<string, unknown>) {
  return {
    practice: "japa",
    occurredOn: "2026-07-30",
    durationSec: 300,
    count: 108,
    clientRef: REF,
    ...partial,
  };
}

describe("sanitizeGuestSessions", () => {
  it("accepts a valid session and shapes the row", () => {
    const rows = sanitizeGuestSessions([session({})], "user-1", TODAY);
    expect(rows).toEqual([
      {
        user_id: "user-1",
        practice: "japa",
        occurred_on: "2026-07-30",
        duration_sec: 300,
        count: 108,
        details: null,
        client_ref: REF,
      },
    ]);
  });

  it("drops malformed entries without throwing", () => {
    const rows = sanitizeGuestSessions(
      [
        null,
        "string",
        session({ practice: "levitation" }),
        session({ occurredOn: "2026-08-02" }), // future day
        session({ occurredOn: "31-07-2026" }), // wrong shape
        session({ clientRef: "not-a-uuid" }),
        session({ clientRef: undefined }),
        session({}),
      ],
      "user-1",
      TODAY
    );
    expect(rows).toHaveLength(1);
  });

  it("clamps out-of-range numbers to null instead of storing garbage", () => {
    const [rowA] = sanitizeGuestSessions(
      [session({ durationSec: -5, count: 1_000_001 })],
      "u",
      TODAY
    );
    expect(rowA.duration_sec).toBeNull();
    expect(rowA.count).toBeNull();
  });

  it("caps at MERGE_CAP counting received entries, not valid ones", () => {
    const many = Array.from({ length: MERGE_CAP + 50 }, (_, i) =>
      session({
        clientRef: `123e4567-e89b-42d3-a456-4266141${String(i).padStart(5, "0")}`,
      })
    );
    const rows = sanitizeGuestSessions(many, "u", TODAY);
    expect(rows.length).toBeLessThanOrEqual(MERGE_CAP);
  });

  it("tolerates a non-array payload", () => {
    expect(sanitizeGuestSessions(null, "u", TODAY)).toEqual([]);
    expect(sanitizeGuestSessions({ evil: true }, "u", TODAY)).toEqual([]);
  });
});

describe("foldStreakDays", () => {
  it("folds consecutive days into a running streak", () => {
    const state = foldStreakDays(["2026-07-29", "2026-07-30", "2026-07-31"]);
    expect(state.current).toBe(3);
    expect(state.longest).toBe(3);
    expect(state.lastDay).toBe("2026-07-31");
  });

  it("sorts and dedupes raw rows before folding", () => {
    const state = foldStreakDays([
      "2026-07-31",
      "2026-07-29",
      "2026-07-30",
      "2026-07-30",
    ]);
    expect(state.current).toBe(3);
  });

  it("a one-day gap consumes grace and keeps the streak", () => {
    const state = foldStreakDays(["2026-07-28", "2026-07-29", "2026-07-31"]);
    expect(state.current).toBe(3);
    expect(state.graceUsedOn).toBe("2026-07-31");
  });

  it("a two-day gap resets to 1 but longest survives", () => {
    const state = foldStreakDays([
      "2026-07-25",
      "2026-07-26",
      "2026-07-27",
      "2026-07-31",
    ]);
    expect(state.current).toBe(1);
    expect(state.longest).toBe(3);
  });

  it("empty history is the zero state", () => {
    expect(foldStreakDays([])).toEqual({
      current: 0,
      longest: 0,
      lastDay: null,
      graceUsedOn: null,
    });
  });
});
