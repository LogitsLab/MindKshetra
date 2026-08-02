import { describe, it, expect, afterEach } from "vitest";
import { killSwitchEngaged } from "@/lib/kill-switch";

const KEY = "TEST_COMMUNITY_SURFACE";

afterEach(() => {
  delete process.env[KEY];
});

describe("killSwitchEngaged", () => {
  it("pauses when unset — a gate you must remember to close is not a gate", () => {
    expect(killSwitchEngaged(KEY)).toBe(true);
  });

  it("opens only on an affirmative value", () => {
    for (const v of ["true", "1", "on", "yes", " TRUE "]) {
      process.env[KEY] = v;
      expect(killSwitchEngaged(KEY)).toBe(false);
    }
  });

  it("pauses on every off spelling, including sloppy ones", () => {
    for (const v of ["false", "0", "off", "no", " Off "]) {
      process.env[KEY] = v;
      expect(killSwitchEngaged(KEY)).toBe(true);
    }
  });

  it("pauses on an unrecognised value rather than guessing", () => {
    for (const v of ["", "maybe", "tru"]) {
      process.env[KEY] = v;
      expect(killSwitchEngaged(KEY)).toBe(true);
    }
  });
});
