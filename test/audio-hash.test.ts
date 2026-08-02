import { describe, it, expect } from "vitest";
import { normalizeSpeechText, speechHash } from "@/lib/audio/hash";

/**
 * The speech hash is the join key between generated audio files and every
 * client (web bundle, Node generator, Hermes). The limb implementation must
 * match a straight BigInt FNV-1a 64 — if this drifts, players silently fall
 * back to robotic TTS while the bucket holds perfectly good audio.
 */
function referenceFnv1a64(text: string): string {
  // BigInt via constructor strings — the repo's TS target predates 2020 so
  // literals (0x...n) fail tsc even though vitest transpiles them fine.
  let hash = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  const mask = BigInt("0xffffffffffffffff");
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i++) {
    hash ^= BigInt(bytes[i]);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

describe("speechHash", () => {
  const samples = [
    "",
    "a",
    "Settle into your seat. Let the breath be ordinary.",
    "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।",
    "Yogis, having abandoned attachment, perform actions only through the body.",
    "अपनी साँस को सहज रहने दें — कुछ बदलना नहीं है।",
    "x".repeat(2000),
  ];

  it("matches the BigInt reference for every sample", () => {
    for (const s of samples) {
      expect(speechHash(s)).toBe(referenceFnv1a64(normalizeSpeechText(s)));
    }
  });

  it("normalizes whitespace before hashing", () => {
    expect(speechHash("  hello   world \n")).toBe(speechHash("hello world"));
  });

  it("is 16 lowercase hex chars", () => {
    expect(speechHash("anything")).toMatch(/^[0-9a-f]{16}$/);
  });
});
