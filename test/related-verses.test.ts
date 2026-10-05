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
 * tag-overlap count first, then tag rarity, then a stable per-page spread,
 * one verse per chapter first. A flaky tie-break would churn every prerender
 * diff; a chapter-order tie-break sent every page's links to chapter 2.
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

  it("prefers the rarer shared tag when overlap is equal", () => {
    // "duty" is on four candidates, "detachment" on one: sharing the rare
    // tag is the stronger signal.
    const common = [11, 12, 13].map((id) =>
      makeSloka({ id, chapter: 3, verse_number: id, tags: ["duty"] })
    );
    const rare = makeSloka({
      id: 14,
      chapter: 4,
      verse_number: 1,
      tags: ["duty", "detachment"].slice(1),
    });
    const alsoDuty = makeSloka({ id: 15, chapter: 5, verse_number: 1, tags: ["duty"] });
    const ranked = rankRelatedSlokas(current, [...common, alsoDuty, rare]);
    expect(ranked[0].id).toBe(14);
  });

  it("breaks ties deterministically, per page, without favouring early chapters", () => {
    const pool = Array.from({ length: 40 }, (_, i) =>
      makeSloka({
        id: 200 + i,
        chapter: 1 + (i % 18),
        verse_number: 1 + Math.floor(i / 18),
        tags: ["duty"],
      })
    );
    const first = rankRelatedSlokas(current, pool).map((s) => s.id);
    expect(rankRelatedSlokas(current, [...pool].reverse()).map((s) => s.id)).toEqual(first);

    // Another page with the same tags gets a different, equally valid set.
    const other = { ...current, id: 101 };
    expect(rankRelatedSlokas(other, pool).map((s) => s.id)).not.toEqual(first);

    // Ties no longer collapse onto chapter 1.
    const chapters = rankRelatedSlokas(current, pool).map((s) => s.chapter);
    expect(new Set(chapters).size).toBe(4);
  });

  it("spreads picks across chapters before repeating one", () => {
    const pool = [
      makeSloka({ id: 31, chapter: 2, verse_number: 1, tags: ["duty", "action"] }),
      makeSloka({ id: 32, chapter: 2, verse_number: 2, tags: ["duty", "action"] }),
      makeSloka({ id: 33, chapter: 6, verse_number: 1, tags: ["duty"] }),
    ];
    const ranked = rankRelatedSlokas(current, pool, 2);
    expect(ranked.map((s) => s.chapter).sort()).toEqual([2, 6]);
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
