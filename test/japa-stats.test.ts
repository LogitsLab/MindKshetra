import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  JAPA_STATS_KEY,
  emptyJapaStats,
  readJapaStats,
  recordJapaBeads,
} from "@/lib/japa-stats";

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

describe("japa-stats (web localStorage)", () => {
  it("starts empty", () => {
    expect(readJapaStats()).toEqual(emptyJapaStats());
  });

  it("accumulates lifetime and today beads", () => {
    const a = recordJapaBeads(54);
    expect(a.lifetimeBeads).toBe(54);
    expect(a.dayBeads).toBe(54);
    const b = recordJapaBeads(108);
    expect(b.lifetimeBeads).toBe(162);
    expect(b.dayBeads).toBe(162);
    expect(readJapaStats().lifetimeBeads).toBe(162);
    expect(store[JAPA_STATS_KEY]).toContain("162");
  });

  it("ignores non-positive counts", () => {
    recordJapaBeads(10);
    expect(recordJapaBeads(0).lifetimeBeads).toBe(10);
    expect(recordJapaBeads(-3).lifetimeBeads).toBe(10);
  });
});
