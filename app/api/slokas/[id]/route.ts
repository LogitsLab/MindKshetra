import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { warnIfRedisMissing } from "@/lib/redis";
import { getSlokaById } from "@/lib/slokas";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  warnIfRedisMissing();
  const limited = await rateLimit(`sloka:${clientKey(_request)}`, 120, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sloka = await getSlokaById(id);
  if (!sloka) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(sloka, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
