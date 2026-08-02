import { describe, it, expect } from "vitest";
import { metaDescription } from "@/lib/sloka-utils";

/**
 * `metaDescription` feeds 701 verse pages, 18 chapters and 18 moods. Every one
 * of those strings is prerendered into <meta> at build time, so a bad cut is
 * invisible locally and permanent in search results until the next deploy.
 */
describe("metaDescription", () => {
  it("leaves short prose alone", () => {
    expect(metaDescription("You have a right to your actions.")).toBe(
      "You have a right to your actions."
    );
  });

  it("collapses the newlines and double spaces that verse text carries", () => {
    expect(metaDescription("one\n\ntwo   three\t four")).toBe(
      "one two three four"
    );
  });

  it("cuts at a word boundary, never mid-word", () => {
    const text = `${"alpha ".repeat(40)}omega`;
    const out = metaDescription(text, 50);
    expect(out.endsWith("…")).toBe(true);
    // The character before the ellipsis must end a word, not split one.
    expect(out.slice(0, -1)).toMatch(/alpha$/);
    expect(out.length).toBeLessThanOrEqual(51);
  });

  it("does not leave dangling punctuation before the ellipsis", () => {
    expect(metaDescription("Steady in success, steady in failure now", 20)).toBe(
      "Steady in success…"
    );
  });

  it("falls back to a hard cut when one word exceeds the budget", () => {
    const out = metaDescription("x".repeat(200), 20);
    expect(out).toBe(`${"x".repeat(20)}…`);
  });
});
