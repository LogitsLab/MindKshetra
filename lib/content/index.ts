import "server-only";
import * as json from "@/lib/content/json";
import { isDbContentEnabled } from "@/lib/content/source";
import type { Mood, Sloka } from "@/lib/types";

async function db() {
  return import("@/lib/content/db");
}

export async function getAllSlokas(): Promise<Sloka[]> {
  return isDbContentEnabled() ? (await db()).dbGetAllSlokas() : json.jsonGetAllSlokas();
}

export async function getSlokaById(id: number): Promise<Sloka | undefined> {
  return isDbContentEnabled() ? (await db()).dbGetSlokaById(id) : json.jsonGetSlokaById(id);
}

export async function getSlokasByChapter(chapter: number): Promise<Sloka[]> {
  return isDbContentEnabled()
    ? (await db()).dbGetSlokasByChapter(chapter)
    : json.jsonGetSlokasByChapter(chapter);
}

export async function getChapters(): Promise<number[]> {
  return isDbContentEnabled() ? (await db()).dbGetChapters() : json.jsonGetChapters();
}

export async function getSlokaByRef(
  chapter: number,
  verse: number
): Promise<Sloka | undefined> {
  return isDbContentEnabled()
    ? (await db()).dbGetSlokaByRef(chapter, verse)
    : json.jsonGetSlokaByRef(chapter, verse);
}

export async function getSlokasByTags(tags: string[]): Promise<Sloka[]> {
  return isDbContentEnabled()
    ? (await db()).dbGetSlokasByTags(tags)
    : json.jsonGetSlokasByTags(tags);
}

export async function getAdjacentSlokas(id: number): Promise<{
  prev: Sloka | null;
  next: Sloka | null;
}> {
  const all = await getAllSlokas();
  const ordered = [...all].sort(
    (a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number
  );
  const idx = ordered.findIndex((s) => s.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? ordered[idx - 1] : null,
    next: idx < ordered.length - 1 ? ordered[idx + 1] : null,
  };
}

export async function getAllMoods(): Promise<Mood[]> {
  return isDbContentEnabled() ? (await db()).dbGetAllMoods() : json.jsonGetAllMoods();
}

export async function getMoodById(id: string): Promise<Mood | undefined> {
  return isDbContentEnabled() ? (await db()).dbGetMoodById(id) : json.jsonGetMoodById(id);
}

export async function dbVectorSearch(
  ...args: Parameters<Awaited<ReturnType<typeof db>>["dbVectorSearch"]>
) {
  return (await db()).dbVectorSearch(...args);
}

export async function dbGetStory(
  ...args: Parameters<Awaited<ReturnType<typeof db>>["dbGetStory"]>
) {
  return (await db()).dbGetStory(...args);
}

export async function dbSaveStory(
  ...args: Parameters<Awaited<ReturnType<typeof db>>["dbSaveStory"]>
) {
  return (await db()).dbSaveStory(...args);
}

export async function dbCountStories(
  ...args: Parameters<Awaited<ReturnType<typeof db>>["dbCountStories"]>
) {
  return (await db()).dbCountStories(...args);
}

export async function dbLoadStoryVariants(
  ...args: Parameters<Awaited<ReturnType<typeof db>>["dbLoadStoryVariants"]>
) {
  return (await db()).dbLoadStoryVariants(...args);
}

export async function dbUpsertStoryVariant(
  ...args: Parameters<Awaited<ReturnType<typeof db>>["dbUpsertStoryVariant"]>
) {
  return (await db()).dbUpsertStoryVariant(...args);
}

export async function dbReplaceStoryVariants(
  ...args: Parameters<Awaited<ReturnType<typeof db>>["dbReplaceStoryVariants"]>
) {
  return (await db()).dbReplaceStoryVariants(...args);
}
