import { NextRequest, NextResponse } from "next/server";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import { formatVerseRef } from "@/lib/sloka-utils";

/**
 * Server-authoritative verse of the day. Mobile previously derived its own id
 * from the device clock, which could disagree with the web and the VOTD email.
 * `nakshatra` is present when today's pick was moon-driven (provenance line:
 * "Chosen for today's Moon in Rohini") and absent on corpus fallback.
 *
 * Optional `offset` (integer days, e.g. -1 / -2) returns that day's selection —
 * used by the home carousel (today / yesterday / earlier), matching web.
 * Optional `full=1` includes the sloka body so clients skip a second fetch.
 */
export async function GET(request: NextRequest) {
  const offsetRaw = request.nextUrl.searchParams.get("offset");
  const offsetDays = offsetRaw ? Number(offsetRaw) : 0;
  const when = Number.isFinite(offsetDays)
    ? new Date(Date.now() + offsetDays * 86_400_000)
    : new Date();

  const selection = await getVerseOfTheDaySelection(when);
  if (!selection) {
    return NextResponse.json({ error: "Verse unavailable" }, { status: 503 });
  }

  const { sloka, nakshatra } = selection;
  const full = request.nextUrl.searchParams.get("full") === "1";
  const date = when.toISOString().slice(0, 10);
  const base = {
    id: sloka.id,
    ref: formatVerseRef(sloka),
    date,
    offset: Number.isFinite(offsetDays) ? offsetDays : 0,
    ...(nakshatra ? { nakshatra: nakshatra.name } : {}),
  };

  return NextResponse.json(full ? { ...base, sloka } : base, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
    },
  });
}
