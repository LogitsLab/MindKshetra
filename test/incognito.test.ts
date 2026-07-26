import { describe, it, expect } from "vitest";
import {
  INCOGNITO_TTL_SEC,
  incognitoKey,
  mintChartSessionId,
  readChartSessionId,
} from "@/lib/astrology/incognito";

/**
 * ceo/T3 — the id is the Redis key for a chart holding birth date, time and
 * place belonging to someone who chose NOT to sign in. Accepting a
 * client-supplied id meant two clients sending "1" shared one anonymous
 * person's birth details, and the rehydrate paths wrote under that key.
 */
describe("chart session ids", () => {
  it("mints uuid v4", () => {
    const id = mintChartSessionId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("mints a distinct id every call", () => {
    const ids = new Set(Array.from({ length: 200 }, () => mintChartSessionId()));
    expect(ids.size).toBe(200);
  });

  it("accepts an id it minted itself", () => {
    const id = mintChartSessionId();
    expect(readChartSessionId({ chartSessionId: id }, "test")).toEqual({
      ok: true,
      id,
    });
  });

  it("accepts the deprecated sessionId alias for one deploy window", () => {
    const id = mintChartSessionId();
    expect(readChartSessionId({ sessionId: id }, "test")).toEqual({
      ok: true,
      id,
    });
  });

  it("prefers chartSessionId when both are present", () => {
    const a = mintChartSessionId();
    const b = mintChartSessionId();
    const got = readChartSessionId(
      { chartSessionId: a, sessionId: b },
      "test"
    );
    expect(got).toEqual({ ok: true, id: a });
  });

  // The actual exploit: guessable keys.
  it.each(["1", "test", "abc", "0", "session", "../etc", "%00", "null"])(
    "rejects the guessable id %j",
    (bad) => {
      expect(readChartSessionId({ chartSessionId: bad }, "test")).toEqual({
        ok: false,
        reason: "malformed",
      });
    }
  );

  it("rejects a uuid that is not v4 (wrong version nibble)", () => {
    // v1 uuid — real format, but not something this server ever mints.
    expect(
      readChartSessionId(
        { chartSessionId: "f47ac10b-58cc-11e1-b86c-0800200c9a66" },
        "test"
      ).ok
    ).toBe(false);
  });

  it("rejects non-string ids rather than coercing them", () => {
    for (const bad of [123, true, {}, [], 0]) {
      expect(
        readChartSessionId({ chartSessionId: bad as unknown }, "test").ok
      ).toBe(false);
    }
  });

  // Absent is NOT malformed — absent means "mint a fresh one".
  it.each([undefined, null, ""])("treats %j as absent, not invalid", (v) => {
    expect(readChartSessionId({ chartSessionId: v as unknown }, "test")).toEqual(
      { ok: true, id: null }
    );
  });

  it("namespaces the redis key", () => {
    const id = mintChartSessionId();
    expect(incognitoKey(id)).toBe(`astro:incog:${id}`);
  });

  it("keeps the TTL at 6 hours", () => {
    expect(INCOGNITO_TTL_SEC).toBe(60 * 60 * 6);
  });
});
