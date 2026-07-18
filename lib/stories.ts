import { promises as fs } from "fs";
import path from "path";

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

/** Prefer memory on serverless; also sync to disk when writable (local/dev). */
const memoryCache: StoryCache = {};
let writeQueue: Promise<void> = Promise.resolve();
let diskEnabled =
  process.env.VERCEL !== "1" && process.env.STORY_CACHE_MEMORY_ONLY !== "1";
let hydrated = false;

function cacheKey(slokaId: number): string {
  return String(slokaId);
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

  // New format: { en, hi }[]
  if (entry.stories.every(isBilingualVariant)) {
    const stories = entry.stories as StoryVariant[];
    if (!stories.length) return null;
    const lastIndex = Math.min(
      typeof entry.lastIndex === "number" ? entry.lastIndex : 0,
      stories.length - 1
    );
    return { stories, lastIndex };
  }

  // Legacy per-language string[] — drop (plots were not shared across langs)
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
      // Only keep new shared keys ("123"), skip legacy "123:en"
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
      // Read-only FS (common on serverless) — stay memory-only
      diskEnabled = false;
    }
  });
  await writeQueue;
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

export async function getCachedStory(
  slokaId: number,
  lang: StoryLanguage
): Promise<{ story: string; variant: number; total: number } | null> {
  await hydrateFromDisk();
  const entry = memoryCache[cacheKey(slokaId)];
  if (!entry?.stories?.length) return null;
  const idx = Math.min(entry.lastIndex, entry.stories.length - 1);
  return pickStory(entry, lang, idx);
}

export async function cycleCachedStory(
  slokaId: number,
  lang: StoryLanguage
): Promise<{ story: string; variant: number; total: number } | null> {
  await hydrateFromDisk();
  const key = cacheKey(slokaId);
  const entry = memoryCache[key];
  if (!entry?.stories?.length) return null;

  const next = (entry.lastIndex + 1) % entry.stories.length;
  entry.lastIndex = next;
  memoryCache[key] = entry;
  await persistToDisk();

  return pickStory(entry, lang, next);
}

export async function canGenerateNewVariant(slokaId: number): Promise<boolean> {
  await hydrateFromDisk();
  const entry = memoryCache[cacheKey(slokaId)];
  return !entry || entry.stories.length < MAX_VARIANTS;
}

export async function saveStoryVariant(
  slokaId: number,
  variant: StoryVariant
): Promise<{ variant: number; total: number }> {
  await hydrateFromDisk();
  const key = cacheKey(slokaId);
  const entry = memoryCache[key] ?? { stories: [], lastIndex: 0 };

  if (entry.stories.length < MAX_VARIANTS) {
    entry.stories.push(variant);
    entry.lastIndex = entry.stories.length - 1;
  } else {
    const oldest = (entry.lastIndex + 1) % MAX_VARIANTS;
    entry.stories[oldest] = variant;
    entry.lastIndex = oldest;
  }

  memoryCache[key] = entry;
  await persistToDisk();

  return {
    variant: entry.lastIndex + 1,
    total: entry.stories.length,
  };
}
