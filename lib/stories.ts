import { promises as fs } from "fs";
import path from "path";
import seedStories from "@/data/stories-seed.json";
import { isDbContentEnabled } from "@/lib/content/source";
import { isLowQualityStorySeed } from "@/lib/passages";
import { redisEnabled, redisGet, redisSet } from "@/lib/redis";

export type StoryLanguage = "en" | "hi";

export type StoryVariant = {
  en: string;
  hi: string;
};

type StoryEntry = {
  stories: StoryVariant[];
  lastIndex: number;
};

type StoryCache = Record<string, StoryEntry>;

const CACHE_PATH = path.join(process.cwd(), "data", "stories-cache.json");
const MAX_VARIANTS = 3;
const REDIS_PREFIX = "story:";
const REDIS_IDX_PREFIX = "story:idx:";

const seedMap = seedStories as Record<string, StoryVariant>;

/** Prefer memory on serverless; also sync to disk when writable (local/dev). */
const memoryCache: StoryCache = {};
const lastIndexMemory = new Map<number, number>();
let writeQueue: Promise<void> = Promise.resolve();
let diskEnabled =
  process.env.VERCEL !== "1" && process.env.STORY_CACHE_MEMORY_ONLY !== "1";
let hydrated = false;

function cacheKey(slokaId: number): string {
  return String(slokaId);
}

function getSeedEntry(slokaId: number): StoryEntry | null {
  const pair = seedMap[cacheKey(slokaId)];
  if (!pair?.en?.trim() || !pair?.hi?.trim()) return null;
  if (isLowQualityStorySeed(pair.en) || isLowQualityStorySeed(pair.hi)) {
    return null;
  }
  return {
    stories: [{ en: pair.en, hi: pair.hi }],
    lastIndex: 0,
  };
}

function isBilingualVariant(value: unknown): value is StoryVariant {
  if (!value || typeof value !== "object") return false;
  const v = value as StoryVariant;
  return typeof v.en === "string" && typeof v.hi === "string";
}

function normalizeEntry(raw: unknown): StoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as { stories?: unknown; lastIndex?: unknown };
  if (!Array.isArray(entry.stories)) return null;

  if (entry.stories.every(isBilingualVariant)) {
    const stories = entry.stories as StoryVariant[];
    if (!stories.length) return null;
    const lastIndex = Math.min(
      typeof entry.lastIndex === "number" ? entry.lastIndex : 0,
      stories.length - 1
    );
    return { stories, lastIndex };
  }

  return null;
}

async function hydrateFromDisk(): Promise<void> {
  if (hydrated || !diskEnabled) {
    hydrated = true;
    return;
  }
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (!/^\d+$/.test(key)) continue;
      const entry = normalizeEntry(value);
      if (entry) memoryCache[key] = entry;
    }
  } catch {
    /* missing or unreadable — start empty */
  }
  hydrated = true;
}

async function persistToDisk(): Promise<void> {
  if (!diskEnabled) return;
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
      const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(memoryCache, null, 2), "utf8");
      await fs.rename(tmp, CACHE_PATH);
    } catch {
      diskEnabled = false;
    }
  });
  await writeQueue;
}

async function getLastIndex(slokaId: number, max: number): Promise<number> {
  if (lastIndexMemory.has(slokaId)) {
    return Math.min(lastIndexMemory.get(slokaId)!, Math.max(0, max));
  }
  if (redisEnabled()) {
    const raw = await redisGet(`${REDIS_IDX_PREFIX}${slokaId}`);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0) {
        return Math.min(n, Math.max(0, max));
      }
    }
  }
  return 0;
}

async function setLastIndex(slokaId: number, index: number): Promise<void> {
  lastIndexMemory.set(slokaId, index);
  if (redisEnabled()) {
    await redisSet(`${REDIS_IDX_PREFIX}${slokaId}`, String(index), 60 * 60 * 24 * 30);
  }
}

async function loadEntryFromDb(slokaId: number): Promise<StoryEntry | null> {
  const { dbLoadStoryVariants } = await import("@/lib/content/db");
  const variants = await dbLoadStoryVariants(slokaId);
  if (!variants.length) {
    // Fallback to bundled seed if DB row missing
    return getSeedEntry(slokaId);
  }
  const lastIndex = await getLastIndex(slokaId, variants.length - 1);
  return { stories: variants, lastIndex };
}

async function saveEntryToDb(slokaId: number, entry: StoryEntry): Promise<void> {
  const { dbReplaceStoryVariants } = await import("@/lib/content/db");
  await dbReplaceStoryVariants(slokaId, entry.stories);
  await setLastIndex(slokaId, entry.lastIndex);
}

async function loadEntryLocal(slokaId: number): Promise<StoryEntry | null> {
  const key = cacheKey(slokaId);
  if (memoryCache[key]) {
    const entry = memoryCache[key];
    if (entry.stories.some((s) => isLowQualityStorySeed(s.en))) {
      delete memoryCache[key];
    } else {
      return entry;
    }
  }

  if (redisEnabled()) {
    const raw = await redisGet(`${REDIS_PREFIX}${key}`);
    if (raw) {
      try {
        const entry = normalizeEntry(JSON.parse(raw));
        if (entry && !entry.stories.some((s) => isLowQualityStorySeed(s.en))) {
          memoryCache[key] = entry;
          return entry;
        }
      } catch {
        /* ignore */
      }
    }
  }

  await hydrateFromDisk();
  if (memoryCache[key]) {
    const entry = memoryCache[key];
    if (entry.stories.some((s) => isLowQualityStorySeed(s.en))) {
      delete memoryCache[key];
    } else {
      return entry;
    }
  }

  return getSeedEntry(slokaId);
}

async function saveEntryLocal(slokaId: number, entry: StoryEntry): Promise<void> {
  const key = cacheKey(slokaId);
  memoryCache[key] = entry;
  if (redisEnabled()) {
    await redisSet(
      `${REDIS_PREFIX}${key}`,
      JSON.stringify(entry),
      60 * 60 * 24 * 30
    );
  }
  await persistToDisk();
}

async function loadEntry(slokaId: number): Promise<StoryEntry | null> {
  if (isDbContentEnabled()) {
    try {
      return await loadEntryFromDb(slokaId);
    } catch (err) {
      console.warn("[stories] DB load failed, falling back to local", err);
      return loadEntryLocal(slokaId);
    }
  }
  return loadEntryLocal(slokaId);
}

async function saveEntry(slokaId: number, entry: StoryEntry): Promise<void> {
  if (isDbContentEnabled()) {
    try {
      await saveEntryToDb(slokaId, entry);
      return;
    } catch (err) {
      console.warn("[stories] DB save failed, falling back to local", err);
    }
  }
  await saveEntryLocal(slokaId, entry);
}

function pickStory(
  entry: StoryEntry,
  lang: StoryLanguage,
  index: number
): { story: string; variant: number; total: number } {
  const story = entry.stories[index][lang];
  return {
    story,
    variant: index + 1,
    total: entry.stories.length,
  };
}

function isSeededEntry(entry: StoryEntry, slokaId: number): boolean {
  const seed = getSeedEntry(slokaId);
  if (!seed || entry.stories.length !== 1) return false;
  return (
    entry.stories[0].en === seed.stories[0].en &&
    entry.stories[0].hi === seed.stories[0].hi
  );
}

export async function getCachedStory(
  slokaId: number,
  lang: StoryLanguage
): Promise<{
  story: string;
  variant: number;
  total: number;
  seeded: boolean;
} | null> {
  const entry = await loadEntry(slokaId);
  if (!entry?.stories?.length) return null;
  const idx = Math.min(entry.lastIndex, entry.stories.length - 1);
  const picked = pickStory(entry, lang, idx);
  return { ...picked, seeded: isSeededEntry(entry, slokaId) };
}

export async function cycleCachedStory(
  slokaId: number,
  lang: StoryLanguage
): Promise<{
  story: string;
  variant: number;
  total: number;
  seeded: boolean;
} | null> {
  const entry = await loadEntry(slokaId);
  if (!entry?.stories?.length) return null;

  const next = (entry.lastIndex + 1) % entry.stories.length;
  const cloned: StoryEntry = {
    stories: [...entry.stories],
    lastIndex: next,
  };

  if (isDbContentEnabled()) {
    // Variants already in DB — only advance the cursor
    await setLastIndex(slokaId, next);
  } else {
    await saveEntry(slokaId, cloned);
  }

  return getCachedStory(slokaId, lang);
}

export async function canGenerateNewVariant(slokaId: number): Promise<boolean> {
  const entry = await loadEntry(slokaId);
  return !entry || entry.stories.length < MAX_VARIANTS;
}

export async function saveStoryVariant(
  slokaId: number,
  variant: StoryVariant
): Promise<{ variant: number; total: number }> {
  const existing = await loadEntry(slokaId);
  const entry: StoryEntry = existing
    ? { stories: [...existing.stories], lastIndex: existing.lastIndex }
    : { stories: [], lastIndex: 0 };

  if (entry.stories.length < MAX_VARIANTS) {
    entry.stories.push(variant);
    entry.lastIndex = entry.stories.length - 1;
  } else {
    // Keep the first (default) story; rotate generated slots only
    const replaceAt =
      entry.stories.length > 1
        ? entry.lastIndex <= 0
          ? 1
          : ((entry.lastIndex - 1 + 1) % (MAX_VARIANTS - 1)) + 1
        : 0;
    entry.stories[replaceAt] = variant;
    entry.lastIndex = replaceAt;
  }

  if (isDbContentEnabled()) {
    try {
      const { dbReplaceStoryVariants } = await import("@/lib/content/db");
      await dbReplaceStoryVariants(slokaId, entry.stories);
      await setLastIndex(slokaId, entry.lastIndex);
      return {
        variant: entry.lastIndex + 1,
        total: entry.stories.length,
      };
    } catch (err) {
      console.warn("[stories] DB save variant failed, falling back", err);
    }
  }

  await saveEntryLocal(slokaId, entry);

  return {
    variant: entry.lastIndex + 1,
    total: entry.stories.length,
  };
}
