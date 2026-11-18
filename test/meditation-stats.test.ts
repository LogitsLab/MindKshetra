import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adHocMeditationSession } from "@/lib/meditation-audio";
import {
  MEDITATION_STATS_KEY,
  readMeditationStats,
  recordMeditationSit,
  readSilentSetup,
  writeSilentSetup,
} from "@/lib/meditation-stats";
import { getSessionById } from "@/lib/meditation";

const store: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  });
});

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("meditation stats", () => {
  it("adds minutes on the same day and keeps a lifetime total", () => {
    recordMeditationSit(600);
    const again = recordMeditationSit(600);
    expect(again.dayMinutes).toBe(20);
    expect(again.lifetimeMinutes).toBe(20);
    expect(again.lifetimeSits).toBe(2);
    expect(store[MEDITATION_STATS_KEY]).toContain("20");
    expect(readMeditationStats().daySits).toBe(2);
  });

  it("remembers the silent setup", () => {
    writeSilentSetup({ minutes: 20, bed: "bowls", intervalMin: 5 });
    expect(readSilentSetup()).toEqual({ minutes: 20, bed: "bowls", intervalMin: 5 });
  });
});

describe("ad hoc meditation ids", () => {
  it("resolves silent presets and sleep beds", () => {
    expect(adHocMeditationSession("silent-10")?.duration_minutes).toBe(10);
    expect(adHocMeditationSession("silent-7")).toBeNull();
    expect(adHocMeditationSession("sleep-bed-holizna-rain-15")?.audio_url).toContain(
      "holizna-rain-sleep.m4a"
    );
    expect(adHocMeditationSession("sleep-bed-holizna-rain-12")).toBeNull();
  });

  it("resolves sleep-7 through getSessionById", () => {
    const day = getSessionById("sleep-7-d1");
    expect(day?.tier).toBe("goal");
    expect(day?.track).toBe("sleep");
    expect(getSessionById("silent-10")?.id).toBe("silent-10");
  });
});
