import { NextRequest, NextResponse } from "next/server";
import { resolveBirthInstant } from "@/lib/astrology/geo";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rl = await rateLimit(`astro:resolve:${clientKey(request)}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = resolveBirthInstant({
      dob: String(body.dob || ""),
      tob: body.tob == null || body.tob === "" ? null : String(body.tob),
      tobUnknown: Boolean(body.tobUnknown),
      lat: Number(body.lat),
      lng: Number(body.lng),
      placeLabel: String(body.placeLabel || ""),
      ianaTz: body.ianaTz ? String(body.ianaTz) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
