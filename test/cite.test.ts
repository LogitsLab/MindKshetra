import { describe, it, expect } from "vitest";
import { extractCitedRefs } from "@/lib/cite";

/**
 * lib/cite.ts finds Gita chapter.verse citations in model output.
 *
 * These tests pin the CURRENT behaviour, including a collision that becomes a
 * live bug once chart readings share a reply with the teaching (Wave 3):
 * `blend.ts` defines the marriage houses as [7, 2, 11], so a reading naturally
 * says things like "your 2.11 axis" — and 2.11 is a real verse. Dot-form refs
 * skip the context gate by design (they are the app's normal form), so the
 * extractor grabs it.
 *
 * The Wave 3 fix is scope, not regex: run cite.ts over the TEACHING text only.
 * If someone later "fixes" this by tightening the dot-form rule, the last test
 * here should fail and make them think twice.
 */
describe("citation extraction", () => {
  it("finds a plain dot ref", () => {
    expect(extractCitedRefs("As it says in 2.47, act without attachment.")).toContain("2.47");
  });

  it("finds a colon ref when citation context is nearby", () => {
    expect(extractCitedRefs("see verse 2:47 for this")).toContain("2.47");
  });

  it("ignores a colon ref with no citation context (clock times)", () => {
    expect(extractCitedRefs("we met at 2:30 yesterday")).toEqual([]);
  });

  it("rejects a chapter above 18", () => {
    expect(extractCitedRefs("reference 22.4 here")).toEqual([]);
  });

  it("rejects a verse beyond that chapter's length", () => {
    // Chapter 2 has 72 verses.
    expect(extractCitedRefs("see 2.99")).toEqual([]);
  });

  it("finds several refs in one reply", () => {
    const refs = extractCitedRefs("Both 2.47 and 3.35 speak to duty.");
    expect(refs).toContain("2.47");
    expect(refs).toContain("3.35");
  });

  // REGRESSION: these were dead code. \b is defined by [A-Za-z0-9_], so it can
  // never match after a Devanagari character — every Devanagari context term in
  // CITE_CONTEXT silently failed, dropping colon-form citations in Hindi replies.
  it.each(["श्लोक 2:47 में", "गीता 2:47", "अध्याय 2:47"])(
    "handles Devanagari citation context: %s",
    (text) => {
      expect(extractCitedRefs(text)).toContain("2.47");
    }
  );

  it("still ignores a Hindi sentence with a clock time and no citation word", () => {
    expect(extractCitedRefs("हम 2:30 पर मिले")).toEqual([]);
  });

  /**
   * The collision. Documented, not "fixed" here.
   *
   * A chart reading mentioning the 2nd and 11th houses reads as verse 2.11 to
   * this extractor. Chapter 2 has 72 verses so it is in range, and dot form
   * bypasses the context gate. Nothing in cite.ts can distinguish the two —
   * only the CALLER knows whether the text is a reading or a teaching.
   */
  it("KNOWN: a chart house pair is indistinguishable from a verse ref", () => {
    expect(extractCitedRefs("Saturn holds your 2.11 axis")).toContain("2.11");
  });

  it("KNOWN: a degree reading can also parse as a verse ref", () => {
    // Chapter 10 has 42 verses, so 10.42 is a valid ref AND a plausible degree.
    expect(extractCitedRefs("Mars at 10.42 degrees")).toContain("10.42");
  });
});
