import { createClient, getSignedInUserId } from "@/lib/supabase/server";

/**
 * ceo/T12, retired as a paywall (July 2026): MindKshetra is a nonprofit and
 * every feature is free, forever. No route may gate on this module — the last
 * gate (Kundli Milan compatibility) was removed with that decision, and
 * `PAYWALL_ENABLED` is gone with it.
 *
 * The `entitlements` table (migration 009) stays for RECOGNITION only: a
 * Sustainer badge granted by a future donation webhook. Its
 * `external_ref UNIQUE` column makes webhook inserts idempotent, so a
 * provider retrying a delivery can never double-grant.
 *
 * Grants are cosmetic, so lookups fail CLOSED (no badge on error) — the
 * opposite of the old paywall's fail-open — because a `false` here never
 * withholds anything of value.
 */
export const GRANTS = {
  /** Recognition for donors. Never gates a feature. */
  sustainerBadge: "supporter_badge",
} as const;

export type Grant = (typeof GRANTS)[keyof typeof GRANTS];

export async function hasGrant(grant: Grant): Promise<boolean> {
  try {
    const userId = await getSignedInUserId();
    if (!userId) return false;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("entitlements")
      .select("id, expires_at")
      .eq("user_id", userId)
      .eq("feature", grant);

    if (error) {
      console.warn("[entitlements] lookup failed:", error.message);
      return false;
    }

    const now = Date.now();
    return (data ?? []).some(
      (row) => !row.expires_at || new Date(row.expires_at).getTime() > now
    );
  } catch (err) {
    console.warn(
      "[entitlements] lookup threw:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}
