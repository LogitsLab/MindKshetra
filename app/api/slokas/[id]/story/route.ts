import { NextRequest, NextResponse } from "next/server";
import { generateBilingualStory } from "@/lib/groq";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { warnIfRedisMissing } from "@/lib/redis";
import { getSlokaById, getTeachingPassage } from "@/lib/slokas";
import {
  canGenerateNewVariant,
  cycleCachedStory,
  getCachedStory,
  saveStoryVariant,
  type StoryLanguage,
  type StoryVariant,
} from "@/lib/stories";

export const runtime = "nodejs";

type Params = { params: { id: string } };

function parseLang(value: string | null): StoryLanguage {
  return value === "hi" ? "hi" : "en";
}

function passagePayload(passage: NonNullable<Awaited<ReturnType<typeof getTeachingPassage>>>) {
  return {
    passage: passage.label,
    unitId: passage.unitId,
    mode: passage.mode,
    titleEn: passage.titleEn,
    titleHi: passage.titleHi,
  };
}

function curatedScene(
  passage: NonNullable<Awaited<ReturnType<typeof getTeachingPassage>>>,
  lang: StoryLanguage
): StoryVariant | null {
  if (passage.mode !== "scene") return null;
  if (!passage.sceneEn?.trim() || !passage.sceneHi?.trim()) return null;
  return { en: passage.sceneEn, hi: passage.sceneHi };
}

export async function GET(request: NextRequest, { params }: Params) {
  warnIfRedisMissing();
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sloka = await getSlokaById(id);
  if (!sloka) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  const passage = await getTeachingPassage(id);
  if (!passage) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  const lang = parseLang(request.nextUrl.searchParams.get("lang"));
  const meta = passagePayload(passage);

  // Scene units: curated note shared by the whole unit
  const scene = curatedScene(passage, lang);
  if (scene) {
    return NextResponse.json({
      story: scene[lang],
      cached: true,
      seeded: true,
      curated: true,
      variant: 1,
      total: 1,
      language: lang,
      ...meta,
    });
  }

  // Teaching units: one story cache for the whole passage (anchor verse)
  const cached = await getCachedStory(passage.anchorId, lang);
  if (!cached) {
    return NextResponse.json({
      story: null,
      cached: false,
      ...meta,
    });
  }

  return NextResponse.json({
    story: cached.story,
    cached: true,
    seeded: cached.seeded,
    curated: false,
    variant: cached.variant,
    total: cached.total,
    language: lang,
    ...meta,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(`story:${clientKey(request)}`, 12, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limited.retryAfterSec}s.` },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sloka = await getSlokaById(id);
  if (!sloka) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  const passage = await getTeachingPassage(id);
  if (!passage) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  const lang = parseLang(request.nextUrl.searchParams.get("lang"));
  const meta = passagePayload(passage);

  let regenerate = false;
  try {
    const body = await request.json().catch(() => ({}));
    regenerate = Boolean(body?.regenerate);
  } catch {
    regenerate = false;
  }

  // Scene units stay on curated notes (optional AI refresh for variety)
  const scene = curatedScene(passage, lang);
  if (scene && !regenerate) {
    return NextResponse.json({
      story: scene[lang],
      cached: true,
      generated: false,
      seeded: true,
      curated: true,
      variant: 1,
      total: 1,
      language: lang,
      ...meta,
    });
  }

  if (!process.env.GROQ_API_KEY) {
    if (scene) {
      return NextResponse.json({
        story: scene[lang],
        cached: true,
        generated: false,
        seeded: true,
        curated: true,
        variant: 1,
        total: 1,
        language: lang,
        ...meta,
      });
    }
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const storyKey = passage.anchorId;
  const genMeta = {
    title: passage.titleEn,
    theme: passage.themeEn,
    mode: passage.mode,
  };

  try {
    if (regenerate) {
      // Scene: generate an alternate scene-note variant under the anchor
      if (passage.mode === "scene") {
        const allowNew = await canGenerateNewVariant(storyKey);
        if (allowNew) {
          const pair = await generateBilingualStory(
            passage.verses,
            passage.focus,
            genMeta
          );
          const saved = await saveStoryVariant(storyKey, pair);
          return NextResponse.json({
            story: pair[lang],
            cached: false,
            generated: true,
            seeded: false,
            curated: false,
            variant: saved.variant,
            total: saved.total,
            language: lang,
            ...meta,
          });
        }
        const next = await cycleCachedStory(storyKey, lang);
        if (next) {
          return NextResponse.json({
            story: next.story,
            cached: true,
            generated: false,
            seeded: next.seeded,
            curated: false,
            variant: next.variant,
            total: next.total,
            language: lang,
            ...meta,
          });
        }
        // Fall back to curated scene
        if (scene) {
          return NextResponse.json({
            story: scene[lang],
            cached: true,
            generated: false,
            seeded: true,
            curated: true,
            variant: 1,
            total: 1,
            language: lang,
            ...meta,
          });
        }
      }

      const next = await cycleCachedStory(storyKey, lang);
      const allowNew = await canGenerateNewVariant(storyKey);
      if (next && !allowNew) {
        return NextResponse.json({
          story: next.story,
          cached: true,
          generated: false,
          seeded: next.seeded,
          curated: false,
          variant: next.variant,
          total: next.total,
          language: lang,
          ...meta,
        });
      }
      if (allowNew) {
        const pair = await generateBilingualStory(
          passage.verses,
          passage.focus,
          genMeta
        );
        const saved = await saveStoryVariant(storyKey, pair);
        return NextResponse.json({
          story: pair[lang],
          cached: false,
          generated: true,
          seeded: false,
          curated: false,
          variant: saved.variant,
          total: saved.total,
          language: lang,
          ...meta,
        });
      }
    }

    const existing = await getCachedStory(storyKey, lang);
    if (existing && !regenerate) {
      return NextResponse.json({
        story: existing.story,
        cached: true,
        generated: false,
        seeded: existing.seeded,
        curated: false,
        variant: existing.variant,
        total: existing.total,
        language: lang,
        ...meta,
      });
    }

    if (scene && passage.mode === "scene") {
      return NextResponse.json({
        story: scene[lang],
        cached: true,
        generated: false,
        seeded: true,
        curated: true,
        variant: 1,
        total: 1,
        language: lang,
        ...meta,
      });
    }

    const pair = await generateBilingualStory(
      passage.verses,
      passage.focus,
      genMeta
    );
    const saved = await saveStoryVariant(storyKey, pair);
    return NextResponse.json({
      story: pair[lang],
      cached: false,
      generated: true,
      seeded: false,
      curated: false,
      variant: saved.variant,
      total: saved.total,
      language: lang,
      ...meta,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Story generation failed";
    if (scene) {
      return NextResponse.json({
        story: scene[lang],
        cached: true,
        generated: false,
        seeded: true,
        curated: true,
        variant: 1,
        total: 1,
        language: lang,
        ...meta,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
