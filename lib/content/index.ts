import "server-only";
import * as json from "@/lib/content/json";
import { isDbContentEnabled } from "@/lib/content/source";
import type { Mood, Sloka } from "@/lib/types";

async function db() {
  return import("@/lib/content/db");
}

export async function getAllSlokas(): Promise<Sloka[]> {
  if (!isDbContentEnabled()) return json.jsonGetAllSlokas();
  try {
    return await (await db()).dbGetAllSlokas();
  } catch (err) {
    console.warn(
      "[content] dbGetAllSlokas failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetAllSlokas();
  }
}

export async function getSlokaById(id: number): Promise<Sloka | undefined> {
  if (!isDbContentEnabled()) return json.jsonGetSlokaById(id);
  try {
    return await (await db()).dbGetSlokaById(id);
  } catch (err) {
    console.warn(
      "[content] dbGetSlokaById failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetSlokaById(id);
  }
}

/** Bulk lookup preserving input order; unknown ids are skipped. */
export async function getSlokasByIds(ids: number[]): Promise<Sloka[]> {
  if (!isDbContentEnabled()) return json.jsonGetSlokasByIds(ids);
  try {
    return await (await db()).dbGetSlokasByIds(ids);
  } catch (err) {
    console.warn(
      "[content] dbGetSlokasByIds failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetSlokasByIds(ids);
  }
}

export async function getSlokasByChapter(chapter: number): Promise<Sloka[]> {
  if (!isDbContentEnabled()) return json.jsonGetSlokasByChapter(chapter);
  try {
    return await (await db()).dbGetSlokasByChapter(chapter);
  } catch (err) {
    console.warn(
      "[content] dbGetSlokasByChapter failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetSlokasByChapter(chapter);
  }
}

export async function getChapters(): Promise<number[]> {
  if (!isDbContentEnabled()) return json.jsonGetChapters();
  try {
    return await (await db()).dbGetChapters();
  } catch (err) {
    console.warn(
      "[content] dbGetChapters failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetChapters();
  }
}

export async function getSlokaByRef(
  chapter: number,
  verse: number
): Promise<Sloka | undefined> {
  if (!isDbContentEnabled()) return json.jsonGetSlokaByRef(chapter, verse);
  try {
    return await (await db()).dbGetSlokaByRef(chapter, verse);
  } catch (err) {
    console.warn(
      "[content] dbGetSlokaByRef failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetSlokaByRef(chapter, verse);
  }
}

export async function getSlokasByTags(tags: string[]): Promise<Sloka[]> {
  if (!isDbContentEnabled()) return json.jsonGetSlokasByTags(tags);
  try {
    return await (await db()).dbGetSlokasByTags(tags);
  } catch (err) {
    console.warn(
      "[content] dbGetSlokasByTags failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetSlokasByTags(tags);
  }
}

export async function getAdjacentSlokas(id: number): Promise<{
  prev: Sloka | null;
  next: Sloka | null;
}> {
  // JSON mode has a pre-sorted corpus; re-sorting all 701 per verse render
  // was pure waste on the hottest page in the product.
  if (!isDbContentEnabled()) return json.jsonGetAdjacentSlokas(id);
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
  if (!isDbContentEnabled()) return json.jsonGetAllMoods();
  try {
    return await (await db()).dbGetAllMoods();
  } catch (err) {
    console.warn(
      "[content] dbGetAllMoods failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetAllMoods();
  }
}

export async function getMoodById(id: string): Promise<Mood | undefined> {
  if (!isDbContentEnabled()) return json.jsonGetMoodById(id);
  try {
    return await (await db()).dbGetMoodById(id);
  } catch (err) {
    console.warn(
      "[content] dbGetMoodById failed, falling back to JSON:",
      err instanceof Error ? err.message : err
    );
    return json.jsonGetMoodById(id);
  }
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
