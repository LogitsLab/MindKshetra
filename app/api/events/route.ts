import { NextRequest, NextResponse } from "next/server";
import { isEventName, recordEvent } from "@/lib/events";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Client event sink. Allowlisted names only; the user id comes from auth, not
 * the body. Always answers 202 on accepted input — clients fire-and-forget.
 */
export async function POST(request: NextRequest) {
  // Keyed per-user when signed in so carrier-NAT users don't share a bucket.
  const userId = await getAuthUserId();
  const rl = await rateLimit(`events:${principalKey(userId, request)}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !isEventName(body.name)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const props =
    body.props && typeof body.props === "object" && !Array.isArray(body.props)
      ? (body.props as Record<string, unknown>)
      : undefined;

  await recordEvent(body.name, userId, props);
  return NextResponse.json({ ok: true }, { status: 202 });
}
