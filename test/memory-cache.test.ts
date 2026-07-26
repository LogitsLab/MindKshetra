import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  memoryGet,
  memorySet,
  memoryCacheStats,
} from "@/lib/astrology/memory-cache";

/**
 * eng/E5 — the previous guard looked bounded but was not:
 *
 *   if (store.size > 200) { delete entries where now >= expiresAt }
 *   store.set(key, ...)          <- ran unconditionally
 *
 * When every entry was still inside its TTL the sweep deleted nothing and the
 * set proceeded anyway, so the map grew without limit while holding whole
 * ChartPayload objects. A Redis outage under load became an OOM crash.
 */
describe("memory cache", () => {
  beforeEach(() => {
    // Drain: fill past the cap with already-expired rows, then read them out.
    for (let i = 0; i < 400; i++) memorySet(`drain${i}`, "x", -1);
    for (let i = 0; i < 400; i++) memoryGet(`drain${i}`);
  });

  it("stores and reads back", () => {
    memorySet("k", "v", 60);
    expect(memoryGet("k")).toBe("v");
  });

  it("returns null for an unknown key", () => {
    expect(memoryGet("nope")).toBeNull();
  });

  it("expires on read", () => {
    memorySet("gone", "v", -1);
    expect(memoryGet("gone")).toBeNull();
  });

  // The regression this fix exists for.
  it("stays bounded when every entry is still live", () => {
    for (let i = 0; i < 500; i++) memorySet(`live${i}`, `v${i}`, 3600);
    const { size, maxEntries } = memoryCacheStats();
    expect(size).toBeLessThanOrEqual(maxEntries);
  });

  it("evicts oldest-first, keeping the newest", () => {
    for (let i = 0; i < 300; i++) memorySet(`fifo${i}`, `v${i}`, 3600);
    expect(memoryGet("fifo0")).toBeNull(); // oldest gone
    expect(memoryGet("fifo299")).toBe("v299"); // newest kept
  });

  it("counts pressure evictions so a Redis outage is visible", () => {
    const before = memoryCacheStats().pressureEvictions;
    for (let i = 0; i < 300; i++) memorySet(`p${i}`, "v", 3600);
    expect(memoryCacheStats().pressureEvictions).toBeGreaterThan(before);
  });

  it("does not grow when overwriting an existing key", () => {
    for (let i = 0; i < 50; i++) memorySet(`ow${i}`, "v", 3600);
    const before = memoryCacheStats().size;
    for (let n = 0; n < 100; n++) memorySet("ow0", `again${n}`, 3600);
    expect(memoryCacheStats().size).toBe(before);
    expect(memoryGet("ow0")).toBe("again99");
  });

  it("prefers sweeping expired entries over evicting live ones", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (let i = 0; i < 199; i++) memorySet(`exp${i}`, "v", -1);
    const evictionsBefore = memoryCacheStats().pressureEvictions;
    memorySet("fresh", "v", 3600);
    // The expired rows absorbed the pressure; nothing live was thrown away.
    expect(memoryCacheStats().pressureEvictions).toBe(evictionsBefore);
    expect(memoryGet("fresh")).toBe("v");
    spy.mockRestore();
  });
});
