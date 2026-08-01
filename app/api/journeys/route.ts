import { NextResponse } from "next/server";
import { listJourneys } from "@/lib/journeys/content";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 300;

/**
 * GET /api/journeys — the catalog, without day bodies.
 *
 * Summaries only: the full 21-day arcs carry guided scripts and would make a
 * list request heavy for no reason. Detail comes from the journey page.
 */
export async function GET() {
  const journeys = listJourneys().map((j) => ({
    id: j.id,
    kind: j.kind,
    unlock: j.unlock,
    daysCount: j.days_count,
    title: { en: j.title_en, hi: j.title_hi },
    intro: { en: j.intro_en, hi: j.intro_hi },
  }));

  return NextResponse.json(
    { journeys },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    }
  );
}
