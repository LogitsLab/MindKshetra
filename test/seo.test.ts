import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import chapters from "@/data/chapters.json";
import slokas from "@/data/slokas.json";
import { chapterRomanizedName, type ChapterMeta } from "@/lib/chapters";
import { MOOD_SEO } from "@/lib/mood-seo";
import { moods } from "@/lib/moods-data";
import {
  chapterSeoDescription,
  chapterSeoTitle,
  pageMetadata,
  verseSeoDescription,
  verseSeoTitle,
} from "@/lib/seo";
import { relatedMoods } from "@/lib/sloka-utils";
import type { Sloka } from "@/lib/types";
import { VERSE_POPULAR_NAMES, versePopularName } from "@/lib/verse-names";

const BRAND_SUFFIX = " · MindKshetra".length;
const corpus = slokas as unknown as Sloka[];

describe("pageMetadata", () => {
  it("sets a self-canonical and page-specific Open Graph tags", () => {
    const meta = pageMetadata({
      title: "Bhagavad Gita verses for anxiety",
      description: "desc",
      path: "/mood/anxious",
    });
    expect(meta.alternates?.canonical).toBe("/mood/anxious");
    expect(meta.openGraph).toMatchObject({
      url: "/mood/anxious",
      title: "Bhagavad Gita verses for anxiety",
      siteName: "MindKshetra",
    });
    expect(meta.robots).toBeUndefined();
  });

  it("marks noindex pages as follow so links still count", () => {
    const meta = pageMetadata({ title: "x", description: "y", path: "/x", noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("verse titles and descriptions", () => {
  it("names famous verses the way they are searched", () => {
    expect(verseSeoTitle("2.47", versePopularName(2, 47))).toBe(
      "Bhagavad Gita 2.47: Karmanye Vadhikaraste – Meaning"
    );
    expect(verseSeoTitle("1.2")).toBe("Bhagavad Gita 1.2: Meaning and Translation");
  });

  it("keeps every verse title short enough to survive truncation", () => {
    for (const s of corpus) {
      const ref = `${s.chapter}.${s.verse_number}`;
      const title = verseSeoTitle(ref, versePopularName(s.chapter, s.verse_number));
      expect(title.length + BRAND_SUFFIX, title).toBeLessThanOrEqual(72);
    }
  });

  it("keeps every verse description within 160 characters", () => {
    for (const s of corpus) {
      const d = verseSeoDescription(`${s.chapter}.${s.verse_number}`, s.english_translation);
      expect(d.length, d).toBeLessThanOrEqual(160);
      expect(d.startsWith(`Bhagavad Gita ${s.chapter}.${s.verse_number} meaning`)).toBe(true);
    }
  });

  it("only names verses that exist", () => {
    const refs = new Set(corpus.map((s) => `${s.chapter}.${s.verse_number}`));
    for (const key of Object.keys(VERSE_POPULAR_NAMES)) {
      expect(refs.has(key), key).toBe(true);
    }
  });
});

describe("chapter titles", () => {
  it("lead with the romanised name and stay in bounds", () => {
    for (const c of chapters as ChapterMeta[]) {
      expect(c.name_romanized, `chapter ${c.number}`).toBeTruthy();
      const title = chapterSeoTitle(c.number, chapterRomanizedName(c));
      expect(title.length + BRAND_SUFFIX, title).toBeLessThanOrEqual(72);
      const d = chapterSeoDescription({
        chapter: c.number,
        romanizedName: chapterRomanizedName(c),
        name: c.name,
        versesCount: c.verses_count,
        moral: c.moral,
      });
      expect(d.length, d).toBeLessThanOrEqual(160);
    }
    expect(chapterSeoTitle(2, "Sankhya Yoga")).toBe("Bhagavad Gita Chapter 2: Sankhya Yoga");
  });
});

describe("mood page copy", () => {
  it("covers every mood with in-bounds, grammatical copy", () => {
    for (const mood of moods) {
      const seo = MOOD_SEO[mood.id];
      expect(seo, mood.id).toBeDefined();
      expect(seo.title.length + BRAND_SUFFIX, seo.title).toBeLessThanOrEqual(72);
      expect(seo.description.length, seo.description).toBeLessThanOrEqual(160);
      expect(seo.description.length).toBeGreaterThan(70);
      expect(seo.title).not.toMatch(/feeling feeling/i);
      expect(seo.description).not.toMatch(/_/);
    }
  });

  it("only links paths that exist", () => {
    for (const [id, seo] of Object.entries(MOOD_SEO)) {
      if (!seo.pathId) continue;
      const file = path.join(process.cwd(), "data", "paths", `${seo.pathId}.json`);
      expect(existsSync(file), `${id} → ${seo.pathId}`).toBe(true);
    }
  });
});

describe("relatedMoods", () => {
  it("links a verse to the moods its tags feed, strongest first", () => {
    const verse = {
      ...corpus[0],
      tags: ["anxiety_fear", "control_of_mind", "overwhelm_burnout"],
    } as Sloka;
    const links = relatedMoods(verse, moods);
    expect(links[0].id).toBe("anxious");
    expect(links.length).toBeLessThanOrEqual(3);
  });
});
