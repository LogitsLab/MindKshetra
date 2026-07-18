import { NextRequest, NextResponse } from "next/server";
import { generateBilingualStory } from "@/lib/groq";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { getSlokaById, getTeachingPassage } from "@/lib/slokas";
import {
  canGenerateNewVariant,
  cycleCachedStory,
  getCachedStory,
  saveStoryVariant,
  type StoryLanguage,
} from "@/lib/stories";

export const runtime = "nodejs";

type Params = { params: { id: string } };

function parseLang(value: string | null): StoryLanguage {
  return value === "hi" ? "hi" : "en";
}

export async function GET(request: NextRequest, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sloka = getSlokaById(id);
  if (!sloka) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  const passage = getTeachingPassage(id);
  const lang = parseLang(request.nextUrl.searchParams.get("lang"));
  const cached = await getCachedStory(id, lang);
  if (!cached) {
    return NextResponse.json({
      story: null,
      cached: false,
      passage: passage?.label ?? null,
    });
  }

  return NextResponse.json({
    story: cached.story,
    cached: true,
    variant: cached.variant,
    total: cached.total,
    language: lang,
    passage: passage?.label ?? null,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = rateLimit(`story:${clientKey(request)}`, 12, 60_000);
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

  const sloka = getSlokaById(id);
  if (!sloka) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  const passage = getTeachingPassage(id);
  if (!passage) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const lang = parseLang(request.nextUrl.searchParams.get("lang"));
  let regenerate = false;
  try {
    const body = await request.json().catch(() => ({}));
    regenerate = Boolean(body?.regenerate);
  } catch {
    regenerate = false;
  }

  const passageMeta = { passage: passage.label };

  try {
    // Prefer cycling existing variants on refresh (same plot pair, next index)
    if (regenerate) {
      const next = await cycleCachedStory(id, lang);
      const allowNew = await canGenerateNewVariant(id);
      if (next && !allowNew) {
        return NextResponse.json({
          story: next.story,
          cached: true,
          generated: false,
          variant: next.variant,
          total: next.total,
          language: lang,
          ...passageMeta,
        });
      }
      // If we have fewer than 3 variants, generate a fresh bilingual pair
      if (allowNew) {
        const pair = await generateBilingualStory(passage.verses, passage.focus);
        const saved = await saveStoryVariant(id, pair);
        return NextResponse.json({
          story: pair[lang],
          cached: false,
          generated: true,
          variant: saved.variant,
          total: saved.total,
          language: lang,
          ...passageMeta,
        });
      }
    }

    const existing = await getCachedStory(id, lang);
    if (existing && !regenerate) {
      return NextResponse.json({
        story: existing.story,
        cached: true,
        generated: false,
        variant: existing.variant,
        total: existing.total,
        language: lang,
        ...passageMeta,
      });
    }

    const pair = await generateBilingualStory(passage.verses, passage.focus);
    const saved = await saveStoryVariant(id, pair);
    return NextResponse.json({
      story: pair[lang],
      cached: false,
      generated: true,
      variant: saved.variant,
      total: saved.total,
      language: lang,
      ...passageMeta,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Story generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
