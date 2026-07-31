import { describe, it, expect } from "vitest";
import {
  PREVIEW_MAX_CHARS,
  rankRelatedSlokas,
  toRelatedVersePreview,
  truncatePreview,
} from "@/lib/sloka-utils";
import type { Sloka } from "@/lib/types";

/**
 * T5 — related-verse interlinks on the verse page. The section is prerendered
 * into all 701 static pages, so the ranking must be pure and deterministic:
 * tag-overlap count first, then chapter/verse order. A flaky tie-break would
 * churn every prerender diff.
 */

function makeSloka(partial: Partial<Sloka> & { id: number }): Sloka {
  return {
    chapter: 1,
    verse_number: partial.id,
    sanskrit_devanagari: "धर्मक्षेत्रे कुरुक्षेत्रे",
    transliteration_iast: "dharmakṣetre kurukṣetre",
    hindi_translation: "हिंदी अनुवाद",
    english_translation: "English translation",
    tags: [],
    ...partial,
  };
}

const current = makeSloka({
  id: 100,
  chapter: 2,
  verse_number: 47,
  tags: ["duty", "detachment", "action"],
});

describe("rankRelatedSlokas", () => {
  it("ranks by shared-tag count, most overlap first", () => {
    const one = makeSloka({ id: 1, tags: ["duty"] });
    const two = makeSloka({ id: 2, tags: ["duty", "action"] });
    const three = makeSloka({ id: 3, tags: ["duty", "detachment", "action"] });

    const ranked = rankRelatedSlokas(current, [one, two, three]);
    expect(ranked.map((s) => s.id)).toEqual([3, 2, 1]);
  });

  it("excludes the current verse even on full tag overlap", () => {
    const twin = makeSloka({ id: 101, tags: ["duty", "detachment", "action"] });
    const ranked = rankRelatedSlokas(current, [current, twin]);
    expect(ranked.map((s) => s.id)).toEqual([101]);
  });

  it("drops candidates sharing no tags", () => {
    const stranger = makeSloka({ id: 5, tags: ["grief", "fear"] });
    expect(rankRelatedSlokas(current, [stranger])).toEqual([]);
  });

  it("breaks equal overlap deterministically by chapter, then verse", () => {
    const late = makeSloka({
      id: 20,
      chapter: 18,
      verse_number: 2,
      tags: ["duty"],
    });
    const earlyChapterLateVerse = makeSloka({
      id: 21,
      chapter: 3,
      verse_number: 30,
      tags: ["duty"],
    });
    const earlyChapterEarlyVerse = makeSloka({
      id: 22,
      chapter: 3,
      verse_number: 4,
      tags: ["duty"],
    });

    const ranked = rankRelatedSlokas(current, [
      late,
      earlyChapterLateVerse,
      earlyChapterEarlyVerse,
    ]);
    expect(ranked.map((s) => s.id)).toEqual([22, 21, 20]);
  });

  it("caps at 4 by default and honours an explicit limit", () => {
    const pool = [1, 2, 3, 4, 5, 6].map((id) =>
      makeSloka({ id, chapter: 1, verse_number: id, tags: ["duty"] })
    );
    expect(rankRelatedSlokas(current, pool)).toHaveLength(4);
    expect(rankRelatedSlokas(current, pool, 2)).toHaveLength(2);
  });

  it("dedupes a candidate appearing twice in the pool", () => {
    const dup = makeSloka({ id: 7, tags: ["duty", "action"] });
    const ranked = rankRelatedSlokas(current, [dup, dup]);
    expect(ranked.map((s) => s.id)).toEqual([7]);
  });

  it("counts overlap on distinct tags even if a candidate repeats one", () => {
    const noisy = makeSloka({ id: 8, tags: ["duty", "duty", "duty"] });
    const clean = makeSloka({ id: 9, tags: ["duty", "action"] });
    const ranked = rankRelatedSlokas(current, [noisy, clean]);
    expect(ranked.map((s) => s.id)).toEqual([9, 8]);
  });
});

describe("truncatePreview", () => {
  it("returns short text unchanged, without an ellipsis", () => {
    expect(truncatePreview("Act without attachment.")).toBe(
      "Act without attachment."
    );
  });

  it("cuts long text on a word boundary and appends an ellipsis", () => {
    const long =
      "You have a right to perform your prescribed duty, but you are not entitled to the fruits of your actions at any time.";
    const out = truncatePreview(long);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS + 1);
    // No mid-word cut: everything before the ellipsis is a prefix of the
    // source ending at a word boundary.
    const body = out.slice(0, -1);
    expect(long.startsWith(body)).toBe(true);
    expect(long[body.length]).toBe(" ");
  });

  it("cuts Devanagari at whitespace so clusters stay intact", () => {
    const hi =
      "कर्म करने में ही तेरा अधिकार है उसके फलों में कभी नहीं इसलिए तू कर्मफल का हेतु मत बन और तेरी अकर्म में भी आसक्ति न हो";
    const out = truncatePreview(hi);
    expect(out.endsWith("…")).toBe(true);
    const body = out.slice(0, -1);
    expect(hi.startsWith(body)).toBe(true);
    expect(hi[body.length]).toBe(" ");
  });

  it("hard-cuts an unbroken run rather than returning nothing useful", () => {
    const unbroken = "x".repeat(200);
    const out = truncatePreview(unbroken);
    expect(out).toBe(`${"x".repeat(PREVIEW_MAX_CHARS)}…`);
  });

  it("collapses internal whitespace before measuring", () => {
    expect(truncatePreview("a  b\n\nc")).toBe("a b c");
  });
});

describe("toRelatedVersePreview", () => {
  it("keeps only the fields the interlink row renders", () => {
    const sloka = makeSloka({
      id: 42,
      chapter: 2,
      verse_number: 47,
      tags: ["duty"],
      english_meaning: "A very long purport that must not ship to the client.",
      word_meanings: { karma: "action" },
    });
    expect(toRelatedVersePreview(sloka)).toEqual({
      id: 42,
      chapter: 2,
      verse_number: 47,
      previewEn: "English translation",
      previewHi: "हिंदी अनुवाद",
    });
  });
});
