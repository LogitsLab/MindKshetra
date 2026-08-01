import { describe, it, expect } from "vitest";
import {
  filterStreakEligible,
  selectDueCandidates,
  type PrefRow,
} from "@/lib/push-cohort";

function row(partial: Partial<PrefRow>): PrefRow {
  return {
    user_id: "u1",
    timezone: "Asia/Kolkata",
    preferred_language: "en",
    notif_daily_verse: false,
    notif_daily_verse_hour: null,
    notif_streak_reminder: false,
    ...partial,
  };
}

// 02:30 UTC = 08:00 IST — the daily-verse default hour in Kolkata.
const IST_8AM = new Date("2026-08-01T02:30:00Z");
// 14:30 UTC = 20:00 IST — the streak-reminder hour.
const IST_8PM = new Date("2026-08-01T14:30:00Z");

describe("selectDueCandidates", () => {
  it("selects daily_verse at the user's default hour in their timezone", () => {
    const due = selectDueCandidates(
      [row({ notif_daily_verse: true })],
      IST_8AM
    );
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("daily_verse");
    expect(due[0].day).toBe("2026-08-01");
  });

  it("respects a custom chosen hour and skips other hours", () => {
    const rows = [row({ notif_daily_verse: true, notif_daily_verse_hour: 20 })];
    expect(selectDueCandidates(rows, IST_8AM)).toHaveLength(0);
    expect(selectDueCandidates(rows, IST_8PM)).toHaveLength(1);
  });

  it("selects streak_reminder only at 20:00 local", () => {
    const rows = [row({ notif_streak_reminder: true })];
    expect(selectDueCandidates(rows, IST_8AM)).toHaveLength(0);
    const due = selectDueCandidates(rows, IST_8PM);
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("streak_reminder");
  });

  it("a user can be due both kinds in the same tick", () => {
    const due = selectDueCandidates(
      [
        row({
          notif_daily_verse: true,
          notif_daily_verse_hour: 20,
          notif_streak_reminder: true,
        }),
      ],
      IST_8PM
    );
    expect(due.map((d) => d.kind).sort()).toEqual([
      "daily_verse",
      "streak_reminder",
    ]);
  });

  it("falls back to IST for invalid timezones instead of dropping the user", () => {
    const due = selectDueCandidates(
      [row({ notif_daily_verse: true, timezone: "Not/AZone" })],
      IST_8AM
    );
    expect(due).toHaveLength(1);
  });

  it("uses each user's own timezone window", () => {
    // 02:30 UTC is 08:00 in Kolkata but 03:30 in Berlin (CEST).
    const due = selectDueCandidates(
      [
        row({ user_id: "kolkata", notif_daily_verse: true }),
        row({
          user_id: "berlin",
          notif_daily_verse: true,
          timezone: "Europe/Berlin",
        }),
      ],
      IST_8AM
    );
    expect(due.map((d) => d.row.user_id)).toEqual(["kolkata"]);
  });
});

describe("filterStreakEligible", () => {
  const due = selectDueCandidates(
    [row({ notif_streak_reminder: true }), row({ user_id: "u2", notif_daily_verse: true, notif_daily_verse_hour: 20 })],
    IST_8PM
  );

  it("keeps a reminder when the last visit was exactly yesterday-local", () => {
    const kept = filterStreakEligible(
      due,
      new Map([["u1", { current: 3, last: "2026-07-31" }]])
    );
    expect(kept.map((d) => `${d.row.user_id}:${d.kind}`).sort()).toEqual([
      "u1:streak_reminder",
      "u2:daily_verse",
    ]);
  });

  it("drops already-visited-today and lapsed streaks, and users with no row", () => {
    for (const last of ["2026-08-01", "2026-07-30", undefined]) {
      const map = last
        ? new Map([["u1", { current: 3, last }]])
        : new Map<string, { current: number; last: string }>();
      const kept = filterStreakEligible(due, map);
      expect(kept.map((d) => d.kind)).toEqual(["daily_verse"]);
    }
  });
});
