import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless email-unsubscribe tokens: `{userId}.{hex hmac-sha256(userId)}`
 * keyed by UNSUB_SECRET. No table, no expiry — the token is only powerful
 * enough to turn ONE user's VOTD email off, and revocation happens by
 * rotating the secret.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thrown when UNSUB_SECRET is not configured; routes turn it into a 500. */
export class UnsubscribeConfigError extends Error {
  constructor() {
    super(
      "UNSUB_SECRET is not configured — set it in the environment to enable email unsubscribe links"
    );
    this.name = "UnsubscribeConfigError";
  }
}

function secret(): string {
  const value = process.env.UNSUB_SECRET?.trim();
  if (!value) throw new UnsubscribeConfigError();
  return value;
}

function hmacHex(userId: string, key: string): string {
  return createHmac("sha256", key).update(userId).digest("hex");
}

export function makeUnsubscribeToken(userId: string): string {
  return `${userId}.${hmacHex(userId, secret())}`;
}

/**
 * Returns the userId when the token is authentic, null otherwise.
 * Constant-time signature compare; throws UnsubscribeConfigError only when
 * the secret itself is missing.
 */
export function verifyUnsubscribeToken(token: unknown): string | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!UUID_RE.test(userId)) return null;
  if (!/^[0-9a-f]{64}$/.test(signature)) return null;

  const expected = Buffer.from(hmacHex(userId, secret()), "hex");
  const provided = Buffer.from(signature, "hex");
  if (expected.length !== provided.length) return null;
  return timingSafeEqual(expected, provided) ? userId : null;
}

/** Absolute one-click unsubscribe URL for List-Unsubscribe headers. */
export function unsubscribeUrl(userId: string, site: string): string {
  const base = site.replace(/\/$/, "");
  return `${base}/api/unsubscribe?token=${encodeURIComponent(
    makeUnsubscribeToken(userId)
  )}`;
}
