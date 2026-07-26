import { randomUUID } from "crypto";

/**
 * Incognito chart sessions — the contract shared by /api/astrology/compute,
 * /api/astrology/predictions and /api/astrology/chat.
 *
 *   client ──▶ POST (no id)          ──▶ server mints uuid v4 ──▶ astro:incog:<uuid>
 *          ◀── { chartSessionId }
 *   client ──▶ POST (chartSessionId) ──▶ uuid v4 shape check  ──▶ read / rehydrate
 *                                    └─▶ malformed           ──▶ 400
 *
 * Why the id may not come from the client
 * ---------------------------------------
 * The id IS the Redis key, and the value holds birth date, time and place for
 * someone who chose not to sign in. The routes previously accepted any
 * client-supplied id, so two clients sending `"1"` would share one anonymous
 * person's birth details, and the rehydrate paths would WRITE under that
 * guessable key. Ironically it exposed exactly the privacy-conscious users.
 *
 * Shape validation, not an issuance registry: every id the server mints is a v4
 * uuid, so rejecting non-v4 blocks every guessable key. A client that mints its
 * own v4 gains nothing — it would only be writing its own data under a key
 * nobody can guess. A registry would add state for no additional protection.
 *
 * Why the field is not called `sessionId`
 * ---------------------------------------
 * `sessionId` already means "chat_sessions row id" on /api/chat (see
 * lib/chat-store.ts createChatSession). Two unrelated namespaces sharing one
 * field name breaks any route that handles both, which is what the merged chat
 * route will do. `sessionId` is accepted here as a deprecated alias so tabs
 * holding the old client bundle survive one deploy.
 */

/** Incognito charts live 6 hours. Was duplicated as a literal in two routes. */
export const INCOGNITO_TTL_SEC = 60 * 60 * 6;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function incognitoKey(chartSessionId: string): string {
  return `astro:incog:${chartSessionId}`;
}

/** Server-minted only. Callers must never derive an id from the request body. */
export function mintChartSessionId(): string {
  return randomUUID();
}

export type ChartSessionRead =
  | { ok: true; id: string | null }
  | { ok: false; reason: "malformed" };

/**
 * Reads and validates the chart session id from a request body.
 *
 * Returns `{ok: false}` for present-but-malformed rather than null, so callers
 * reject loudly with a 400 instead of silently falling through to casting a
 * fresh chart (which would mask a client bug and burn a compute).
 */
export function readChartSessionId(
  body: Record<string, unknown>,
  routeTag: string
): ChartSessionRead {
  const raw = body.chartSessionId ?? body.sessionId;
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, id: null };
  }
  if (typeof raw !== "string" || !UUID_V4.test(raw)) {
    console.warn(`[${routeTag}] rejected non-uuid chartSessionId`);
    return { ok: false, reason: "malformed" };
  }
  return { ok: true, id: raw };
}
