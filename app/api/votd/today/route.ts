import { NextRequest, NextResponse } from "next/server";
import { getVerseOfTheDay } from "@/lib/day-seed";
import { formatVerseRef } from "@/lib/sloka-utils";

/**
 * Server-authoritative verse of the day. Mobile previously derived its own id
 * from the device clock, which could disagree with the web and the VOTD email.
 */
export async function GET(request: NextRequest) {
  const sloka = await getVerseOfTheDay();
  if (!sloka) {
    return NextResponse.json({ error: "Verse unavailable" }, { status: 503 });
  }

  const full = request.nextUrl.searchParams.get("full") === "1";
  const date = new Date().toISOString().slice(0, 10);

  return NextResponse.json(
    full
      ? { id: sloka.id, ref: formatVerseRef(sloka), date, sloka }
      : { id: sloka.id, ref: formatVerseRef(sloka), date },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
      },
    }
  );
}
