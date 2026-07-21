import "server-only";
import type { Sloka } from "@/lib/types";
import { findPassageUnit, formatPassageRange } from "@/lib/passages";
import {
  formatVerseRef,
  suggestSearchTerms,
  type TeachingPassage,
} from "@/lib/sloka-utils";

export {
  formatVerseRef,
  suggestSearchTerms,
  SEARCH_SUGGESTIONS,
  type TeachingPassage,
} from "@/lib/sloka-utils";

async function content() {
  return import("@/lib/content/index");
}

export async function getAllSlokas(): Promise<Sloka[]> {
  return (await content()).getAllSlokas();
}

export async function getSlokaById(id: number): Promise<Sloka | undefined> {
  return (await content()).getSlokaById(id);
}

export async function getSlokasByChapter(chapter: number): Promise<Sloka[]> {
  return (await content()).getSlokasByChapter(chapter);
}

export async function getChapters(): Promise<number[]> {
  return (await content()).getChapters();
}

export async function getSlokaByRef(
  chapter: number,
  verse: number
): Promise<Sloka | undefined> {
  return (await content()).getSlokaByRef(chapter, verse);
}

export async function getAdjacentSlokas(id: number): Promise<{
  prev: Sloka | null;
  next: Sloka | null;
}> {
  return (await content()).getAdjacentSlokas(id);
}

export async function getSlokasByTags(tags: string[]): Promise<Sloka[]> {
  return (await content()).getSlokasByTags(tags);
}

/**
 * Resolve the curated teaching / scene unit for a verse.
 * Stories are shared across every verse in the unit (keyed by anchorId).
 */
export async function getTeachingPassage(
  id: number
): Promise<TeachingPassage | null> {
  const mod = await content();
  const focus = await mod.getSlokaById(id);
  if (!focus) return null;

  const unit = findPassageUnit(focus.chapter, focus.verse_number);
  const chapterVerses = await mod.getSlokasByChapter(focus.chapter);
  if (!chapterVerses.length) return null;

  if (unit) {
    const verses = chapterVerses.filter(
      (s) => s.verse_number >= unit.from && s.verse_number <= unit.to
    );
    if (!verses.length) return null;
    const first = verses[0];
    const label = formatPassageRange(unit.chapter, unit.from, unit.to);

    return {
      verses,
      focus,
      label,
      anchorId: first.id,
      unitId: unit.id,
      mode: unit.mode,
      titleEn: unit.titleEn,
      titleHi: unit.titleHi,
      themeEn: unit.themeEn,
      themeHi: unit.themeHi,
      sceneEn: unit.sceneEn,
      sceneHi: unit.sceneHi,
    };
  }

  // Fallback: small local window if a verse somehow missed the map
  const idx = chapterVerses.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const window = Math.min(4, chapterVerses.length);
  let start = Math.max(0, idx - 1);
  let end = start + window;
  if (end > chapterVerses.length) {
    end = chapterVerses.length;
    start = Math.max(0, end - window);
  }
  const verses = chapterVerses.slice(start, end);
  const first = verses[0];
  const last = verses[verses.length - 1];
  const label = formatPassageRange(
    first.chapter,
    first.verse_number,
    last.verse_number
  );

  return {
    verses,
    focus,
    label,
    anchorId: first.id,
    unitId: label,
    mode: "teaching",
    titleEn: "Teaching passage",
    titleHi: "शिक्षा-समूह",
    themeEn: "A lived moment that mirrors this teaching",
    themeHi: "इस शिक्षा को छूता हुआ जीवन-क्षण",
  };
}

const SEARCH_ALIASES: Record<string, string[]> = {
  lonely: ["loneliness", "alone", "isolated"],
  loneliness: ["lonely", "alone"],
  anxious: ["anxiety", "fear", "worried"],
  anxiety: ["anxious", "fear", "worried"],
  scared: ["fear", "afraid", "anxiety"],
  angry: ["anger", "rage"],
  sad: ["grief", "sorrow", "loss"],
  stressed: ["stress", "overwhelm", "burnout"],
  tired: ["burnout", "exhaust", "overwhelm"],
  peace: ["equanimity", "calm", "शांति"],
  peaceful: ["peace", "equanimity", "calm"],
  purpose: ["meaning", "duty"],
  lazy: ["unmotivated", "discipline"],
  jealous: ["jealousy", "envy", "comparison"],
  ashamed: ["shame", "guilt"],
  worthless: ["failure", "inadequate", "self worth"],
};

function expandSearchTokens(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const a of SEARCH_ALIASES[t] || []) out.add(a);
  }
  return Array.from(out);
}

export async function searchSlokas(
  query: string,
  limit = 40
): Promise<Sloka[]> {
  const mod = await content();
  const slokas = await mod.getAllSlokas();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const refMatch = q.match(/^(\d{1,2})\s*[.:]\s*(\d{1,3})$/);
  if (refMatch) {
    const chapter = Number(refMatch[1]);
    const verse = Number(refMatch[2]);
    const exact = await mod.getSlokaByRef(chapter, verse);
    return exact ? [exact] : [];
  }

  const tokens = expandSearchTokens(
    q
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9\u0900-\u097f]/gi, ""))
      .filter((t) => t.length > 1)
  );

  const docFreq = new Map<string, number>();
  const haystacks = slokas.map((sloka) => {
    const ref = formatVerseRef(sloka).toLowerCase();
    const hay = [
      ref,
      sloka.english_translation,
      sloka.hindi_translation,
      sloka.english_meaning ?? "",
      sloka.hindi_meaning ?? "",
      sloka.transliteration_iast,
      sloka.sanskrit_devanagari,
      ...sloka.tags.map((t) => t.replace(/_/g, " ")),
    ]
      .join(" ")
      .toLowerCase();
    return { sloka, ref, hay };
  });

  for (const token of tokens) {
    let count = 0;
    for (const { hay } of haystacks) {
      if (hay.includes(token)) count += 1;
    }
    docFreq.set(token, count);
  }

  const N = slokas.length;

  return haystacks
    .map(({ sloka, ref, hay }) => {
      let score = 0;
      if (hay.includes(q)) score += 18;
      for (const token of tokens) {
        if (!hay.includes(token)) continue;
        const df = docFreq.get(token) || 1;
        const idf = Math.log(1 + N / df);
        score += Math.min(8, idf * 2.2);
        if (sloka.tags.some((t) => t.replace(/_/g, " ").includes(token))) {
          score += 3 * Math.min(2, idf);
        }
        if (ref === token || ref.startsWith(`${token}.`)) score += 12;
      }
      const translationHay = [
        sloka.english_translation,
        sloka.hindi_translation,
        sloka.english_meaning ?? "",
        sloka.hindi_meaning ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (tokens.some((t) => translationHay.includes(t))) score += 2;
      return { sloka, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.sloka.chapter - b.sloka.chapter ||
        a.sloka.verse_number - b.sloka.verse_number
    )
    .slice(0, limit)
    .map(({ sloka }) => sloka);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i;
    for (let j = 0; j < b.length; j++) {
      const cur = row[j + 1];
      const cost = a[i] === b[j] ? 0 : 1;
      row[j + 1] = Math.min(row[j + 1] + 1, row[j] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

export async function suggestNearestSlokas(
  query: string,
  limit = 6
): Promise<Sloka[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const corrected = suggestSearchTerms(q, 2);
  const expanded = corrected.length ? corrected.join(" ") : q;
  const direct = await searchSlokas(expanded, limit);
  if (direct.length > 0) return direct;

  const slokas = await getAllSlokas();
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9\u0900-\u097f]/gi, ""))
    .filter((t) => t.length >= 3);

  if (tokens.length === 0) return [];

  const scored = slokas.map((sloka) => {
    let score = 0;
    const tagWords = sloka.tags.map((t) => t.replace(/_/g, " ").toLowerCase());
    const hay = [
      ...tagWords,
      sloka.english_translation.toLowerCase(),
      (sloka.english_meaning ?? "").toLowerCase(),
    ].join(" ");

    for (const token of tokens) {
      if (hay.includes(token)) {
        score += 6;
        continue;
      }
      for (const tw of tagWords) {
        for (const part of tw.split(" ")) {
          if (part.length < 3) continue;
          if (part.startsWith(token) || token.startsWith(part)) {
            score += 4;
            continue;
          }
          const maxDist = token.length <= 4 ? 1 : 2;
          if (levenshtein(token, part) <= maxDist) score += 3;
        }
      }
    }
    return { sloka, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.sloka.chapter - b.sloka.chapter ||
        a.sloka.verse_number - b.sloka.verse_number
    )
    .slice(0, limit)
    .map((r) => r.sloka);
}
