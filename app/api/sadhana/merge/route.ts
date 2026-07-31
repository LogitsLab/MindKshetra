import { NextRequest, NextResponse } from "next/server";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { mergeGuestSadhana } from "@/lib/sadhana";
import { isValidTimezone } from "@/lib/practice-streaks";
import { getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guest→account replay of a device-local practice log, idempotent via
 * (user_id, client_ref). Mirrors /api/progress/merge.
 *
 * 200 → { merged, received, capped, streaks }: `merged` counts rows actually
 * written (a pure replay reports 0); when `capped` is true only the first 200
 * of `received` were considered — chunk and resend the remainder. On any
 * non-200 the client must keep its local log and retry.
 */
export async function POST(request: NextRequest) {
  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `sadhana:merge:${principalKey(userId, request)}`,
    10,
    60_000
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const result = await mergeGuestSadhana(
      userId,
      body.sessions,
      isValidTimezone(body.timezone) ? body.timezone : undefined
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Merge failed";
    console.error("[sadhana/merge]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
