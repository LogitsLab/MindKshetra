import { describe, it, expect } from "vitest";
import { screenText } from "@/lib/moderation";

describe("screenText", () => {
  it("publishes clean reflections", () => {
    expect(
      screenText("Verse 2.47 reminded me to act without clinging to results.")
    ).toEqual({ verdict: "publish" });
  });

  it("rejects links (the no-URLs rule)", () => {
    expect(screenText("check out https://spam.example").verdict).toBe("reject");
    expect(screenText("visit spam-site.com for deals").verdict).toBe("reject");
    expect(screenText("go to www.thing.org now").verdict).toBe("reject");
  });

  it("rejects empty and over-length text", () => {
    expect(screenText("   ")).toEqual({ verdict: "reject", reason: "empty" });
    expect(screenText("a".repeat(1001)).verdict).toBe("reject");
  });

  it("holds crisis language instead of rejecting it — care first", () => {
    const result = screenText("some days I feel I want to die");
    expect(result).toEqual({ verdict: "hold", reason: "crisis" });
  });

  it("holds term hits for human review, never auto-removes", () => {
    expect(screenText("tu chutiya hai")).toEqual({
      verdict: "hold",
      reason: "terms",
    });
  });

  it("does not flag ordinary Hindi devotional text", () => {
    expect(
      screenText("आज का श्लोक मन को शांति देता है। धन्यवाद।").verdict
    ).toBe("publish");
  });
});
