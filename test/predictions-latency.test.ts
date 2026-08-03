import { describe, it, expect } from "vitest";
import {
  RETRY_AFTER_FALLBACK_SEC,
  STAGE_SCHEDULE_MS,
  classifyPredictionsError,
  parseRetryAfter,
  parseStoredBirth,
  stageForElapsedMs,
} from "@/components/astrology/usePredictions";

/**
 * Pure halves of the predictions latency UX (plan Phase B-2). The hook itself
 * is React; what must never regress silently is the status → affordance
 * mapping: a 429 must count down and auto-retry, a recoverable 404 must
 * trigger the one-shot birth re-send, and everything else must offer a plain
 * retry — never a dead end during a 20-60s Groq wait.
 */
describe("classifyPredictionsError", () => {
  it("maps 429 to rate-limited with the Retry-After countdown", () => {
    const res = classifyPredictionsError({
      status: 429,
      retryAfterHeader: "17",
      body: { error: "Too many requests" },
    });
    expect(res.kind).toBe("rate-limited");
    expect(res.retryAfterSec).toBe(17);
    expect(res.recoverable).toBe(true);
  });

  it("falls back to a sane countdown when Retry-After is missing or garbage", () => {
    expect(classifyPredictionsError({ status: 429 }).retryAfterSec).toBe(
      RETRY_AFTER_FALLBACK_SEC
    );
    expect(
      classifyPredictionsError({ status: 429, retryAfterHeader: "soon" })
        .retryAfterSec
    ).toBe(RETRY_AFTER_FALLBACK_SEC);
  });

  it("maps the route's recoverable 404 contract to expired", () => {
    // Exact shape /api/astrology/predictions and /compute return on a
    // session-cache miss (see incognitoMissReason).
    const res = classifyPredictionsError({
      status: 404,
      body: {
        error: "Session expired — cast the chart again",
        reason: "expired",
        recoverable: true,
      },
    });
    expect(res.kind).toBe("expired");
    expect(res.recoverable).toBe(true);
  });

  it("treats a non-recoverable 404 as a plain server failure", () => {
    const res = classifyPredictionsError({
      status: 404,
      body: { error: "Member not found" },
    });
    expect(res.kind).toBe("server");
    expect(res.recoverable).toBe(false);
  });

  it("does not trust recoverable unless it is literally true", () => {
    expect(
      classifyPredictionsError({ status: 404, body: { recoverable: "yes" } })
        .kind
    ).toBe("server");
    expect(classifyPredictionsError({ status: 404, body: null }).kind).toBe(
      "server"
    );
  });

  it("maps 5xx to server and status 0 (fetch rejected) to network", () => {
    expect(classifyPredictionsError({ status: 500 }).kind).toBe("server");
    expect(classifyPredictionsError({ status: 503 }).kind).toBe("server");
    expect(classifyPredictionsError({ status: 0 }).kind).toBe("network");
  });

  it("gives unexpected 4xx the retry affordance rather than a dead end", () => {
    expect(classifyPredictionsError({ status: 400 }).kind).toBe("server");
    expect(classifyPredictionsError({ status: 401 }).kind).toBe("server");
  });
});

describe("parseRetryAfter", () => {
  it("parses delta-seconds and clamps to [1, 600]", () => {
    expect(parseRetryAfter("42")).toBe(42);
    expect(parseRetryAfter(" 42 ")).toBe(42);
    expect(parseRetryAfter("0")).toBe(1);
    expect(parseRetryAfter("99999")).toBe(600);
  });

  it("returns null for missing or unparseable values", () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter("")).toBeNull();
    expect(parseRetryAfter("not-a-date")).toBeNull();
    expect(parseRetryAfter("-5")).toBeNull();
  });

  it("accepts the HTTP-date form and never yields a frozen countdown", () => {
    const future = new Date(Date.now() + 90_000).toUTCString();
    const sec = parseRetryAfter(future);
    expect(sec).toBeGreaterThanOrEqual(85);
    expect(sec).toBeLessThanOrEqual(95);
    // A date in the past still counts down from at least 1.
    const past = new Date(Date.now() - 60_000).toUTCString();
    expect(parseRetryAfter(past)).toBe(1);
  });
});

describe("stageForElapsedMs", () => {
  it("advances through the three honest stages on the documented schedule", () => {
    expect(STAGE_SCHEDULE_MS).toEqual([0, 8_000, 20_000]);
    expect(stageForElapsedMs(0)).toBe(0);
    expect(stageForElapsedMs(7_999)).toBe(0);
    expect(stageForElapsedMs(8_000)).toBe(1);
    expect(stageForElapsedMs(19_999)).toBe(1);
    expect(stageForElapsedMs(20_000)).toBe(2);
    expect(stageForElapsedMs(300_000)).toBe(2);
  });
});

describe("parseStoredBirth", () => {
  const birth = {
    dob: "1990-01-15",
    tob: "06:30",
    lat: 28.61,
    lng: 77.2,
    ianaTz: "Asia/Kolkata",
    placeLabel: "New Delhi",
  };

  it("reads the birth block from the incognito session record", () => {
    const raw = JSON.stringify({ sessionId: "abc", birth });
    expect(parseStoredBirth(raw)).toEqual(birth);
  });

  it("returns null for legacy bare-string session ids", () => {
    // Pre-rename entries stored only the id, not JSON (see app/astrology/page.tsx).
    expect(parseStoredBirth("0b6a2f6e-1111-4222-8333-444455556666")).toBeNull();
  });

  it("returns null for missing, empty, or corrupt values", () => {
    expect(parseStoredBirth(null)).toBeNull();
    expect(parseStoredBirth("")).toBeNull();
    expect(parseStoredBirth("{not json")).toBeNull();
    expect(parseStoredBirth(JSON.stringify({ sessionId: "abc" }))).toBeNull();
  });
});
