import { describe, it, expect } from "vitest";
import { extractCitedRefs, mentionedRetrievedVerses, verifyAndFixCitations } from "@/lib/cite";
import type { Sloka } from "@/lib/types";

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

const v247: Sloka = {
  id: 47,
  chapter: 2,
  verse_number: 47,
  sanskrit_devanagari: "",
  transliteration_iast: "",
  hindi_translation: "",
  english_translation: "You have a right to action alone",
  tags: [],
};

const v626: Sloka = {
  id: 626,
  chapter: 6,
  verse_number: 26,
  sanskrit_devanagari: "",
  transliteration_iast: "",
  hindi_translation: "",
  english_translation: "Whenever the mind wanders",
  tags: [],
};

const v335: Sloka = {
  id: 335,
  chapter: 3,
  verse_number: 35,
  sanskrit_devanagari: "",
  transliteration_iast: "",
  hindi_translation: "",
  english_translation: "Better one's own dharma",
  tags: [],
};

describe("verifyAndFixCitations", () => {
  it("strips invented refs and does not bolt on a verse when none were cited", () => {
    const out = verifyAndFixCitations(
      "Sit for ten minutes. Do not look at 18.66 for a sign.",
      [v247]
    );
    expect(out).not.toMatch(/18\.66/);
    expect(out).not.toMatch(/See 2\.47/);
    expect(out).toContain("Sit for ten minutes");
  });

  it("keeps a retrieved ref the reply actually named", () => {
    const out = verifyAndFixCitations(
      "2.47 is the right to the act, not the fruit.",
      [v247]
    );
    expect(out).toContain("2.47");
  });
});

describe("mentionedRetrievedVerses", () => {
  it("returns nothing when the reply named no verse", () => {
    expect(
      mentionedRetrievedVerses("Sit for ten minutes where you are.", [
        v247,
        v626,
      ])
    ).toEqual([]);
  });

  it("returns at most two retrieved verses, in mention order", () => {
    const used = mentionedRetrievedVerses(
      "6.26 for the wandering mind. 2.47 for the act. 3.35 is extra.",
      [v247, v626, v335]
    );
    expect(used.map((s) => `${s.chapter}.${s.verse_number}`)).toEqual([
      "6.26",
      "2.47",
    ]);
  });
});
