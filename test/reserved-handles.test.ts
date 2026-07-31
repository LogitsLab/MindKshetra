import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidHandle } from "@/lib/profiles";

/**
 * Migration 016 moved the reserved-handle list into a DB check constraint and
 * says it "MUST stay in sync with RESERVED_HANDLES in lib/profiles.ts". Drift
 * in either direction is a real failure mode: a handle reserved only in TS is
 * claimable via any non-API write path; a handle reserved only in SQL turns a
 * profile save the API accepted into an opaque 500. This guard parses both
 * sources and pins the sync.
 */

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/016_ugc_write_enforcement.sql"
);
const PROFILES = join(process.cwd(), "lib/profiles.ts");

function quoted(block: string): string[] {
  return Array.from(block.matchAll(/['"]([a-z0-9_]+)['"]/g)).map((m) => m[1]);
}

function sqlReserved(): string[] {
  const sql = readFileSync(MIGRATION, "utf8");
  const block = sql.match(/check \(handle not in \(([\s\S]*?)\)\)/i)?.[1];
  expect(block, "reserved-handle check constraint not found in 016").toBeTruthy();
  return quoted(block!);
}

function tsReserved(): string[] {
  const ts = readFileSync(PROFILES, "utf8");
  const block = ts.match(/RESERVED_HANDLES = new Set\(\[([\s\S]*?)\]\)/)?.[1];
  expect(block, "RESERVED_HANDLES set literal not found").toBeTruthy();
  return quoted(block!);
}

describe("reserved handles (016 ↔ lib/profiles.ts)", () => {
  it("the DB check constraint and RESERVED_HANDLES agree exactly", () => {
    const sql = sqlReserved().sort();
    const ts = tsReserved().sort();
    expect(sql.length).toBeGreaterThan(0);
    expect(sql).toEqual(ts);
  });

  it("every DB-reserved handle is rejected by isValidHandle", () => {
    for (const handle of sqlReserved()) {
      expect(isValidHandle(handle), `"${handle}" must be reserved`).toBe(false);
    }
  });

  it("isValidHandle still accepts ordinary handles and enforces shape", () => {
    expect(isValidHandle("arjuna_108")).toBe(true);
    expect(isValidHandle("ab")).toBe(false); // too short
    expect(isValidHandle("Seeker")).toBe(false); // uppercase
    expect(isValidHandle("seeker one")).toBe(false); // space
    expect(isValidHandle(42)).toBe(false);
  });
});
