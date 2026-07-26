import { NextRequest } from "next/server";
import { POST as chatPOST } from "@/app/api/chat/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ceo/T6a + ceo/T7 + eng/E9 — deprecated. Forwards to the merged /api/chat.
 *
 * The chart-guide implementation moved to /api/chat, which now produces the
 * two-voice reply whenever memberId / chartSessionId / birth is present. This
 * shim exists purely for the deploy window: a browser tab holding the previous
 * client bundle still POSTs here, and without it that tab's chat would 404 with
 * no retry and no surfaced error — in the same release that carries the crisis
 * intercept and the ephemeris fixes.
 *
 * It IMPORTS AND INVOKES the merged handler rather than fetching it (eng/E9).
 * A server-side fetch would drop the incoming cookies, so `getSignedInUserId()`
 * would return null and every signed-in `memberId` request would silently
 * resolve to "chart not found" — a downgrade that looks like a data problem.
 *
 * REMOVE once the hit counter below stops appearing in logs. It is a single
 * deploy's worth of compatibility, not a permanent alias.
 */
let hits = 0;

export async function POST(request: NextRequest) {
  hits += 1;
  if (hits === 1 || hits % 50 === 0) {
    console.warn(
      `[astro-chat] DEPRECATED route hit ${hits}x — a client is still posting ` +
        `to /api/astrology/chat. Safe to delete this shim once this stops.`
    );
  }
  return chatPOST(request);
}
