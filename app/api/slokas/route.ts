import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { warnIfRedisMissing } from "@/lib/redis";
import {
  getAllSlokas,
  getSlokasByChapter,
  searchSlokas,
  suggestNearestSlokas,
  suggestSearchTerms,
} from "@/lib/slokas";

const CACHE_STATIC = "public, max-age=3600, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  warnIfRedisMissing();

  const limited = await rateLimit(`slokas:${clientKey(request)}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limited.retryAfterSec}s.` },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const chapterParam = request.nextUrl.searchParams.get("chapter");
  const q = request.nextUrl.searchParams.get("q");

  if (q?.trim()) {
    const results = searchSlokas(q, 40);
    if (results.length > 0) {
      return NextResponse.json(
        { results },
        {
          headers: {
            "Cache-Control":
              "public, max-age=60, stale-while-revalidate=300",
          },
        }
      );
    }

    const didYouMean = suggestSearchTerms(q, 3);
    const nearest =
      didYouMean.length > 0
        ? searchSlokas(didYouMean[0], 6)
        : suggestNearestSlokas(q, 6);

    return NextResponse.json(
      {
        results: [],
        nearest,
        didYouMean,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  }

  if (chapterParam) {
    const chapter = Number(chapterParam);
    if (!Number.isInteger(chapter) || chapter < 1) {
      return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
    }
    return NextResponse.json(getSlokasByChapter(chapter), {
      headers: { "Cache-Control": CACHE_STATIC },
    });
  }

  // Full corpus — keep for tooling; UI does not call this path
  return NextResponse.json(getAllSlokas(), {
    headers: { "Cache-Control": CACHE_STATIC },
  });
}
