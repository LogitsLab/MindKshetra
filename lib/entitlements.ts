import { createClient, getSignedInUserId } from "@/lib/supabase/server";

/**
 * ceo/T12 — feature entitlements.
 *
 *   request ──▶ hasEntitlement(feature) ──┬─▶ true  ─▶ serve
 *                                         └─▶ false ─▶ 402 + upgrade copy
 *
 * Provider-agnostic by design. eng/E15 (Razorpay onboarding) is weeks of
 * external process — entity registration, business KYC, RBI e-mandate approval
 * — so the gate ships and is testable now; a live provider only needs a webhook
 * that inserts rows.
 *
 * FAIL-OPEN is deliberate. If Supabase is unreachable we grant access rather
 * than deny it: a billing lookup outage must never lock a paying user out of
 * something they already bought. The revenue risk of a brief free window is far
 * smaller than the trust cost of "you paid and we locked you out".
 */
export const FEATURES = {
  /** Kundli Milan compatibility between two saved members. */
  compatibility: "compatibility",
  /** Long-form written predictions per life area. */
  deepReading: "deep_reading",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

/** Paywall is off until a payment provider is live. Flip to enable gating. */
export function paywallEnabled(): boolean {
  return process.env.PAYWALL_ENABLED === "1";
}

export async function hasEntitlement(feature: Feature): Promise<boolean> {
  if (!paywallEnabled()) return true;

  try {
    const userId = await getSignedInUserId();
    if (!userId) return false;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("entitlements")
      .select("id, expires_at")
      .eq("user_id", userId)
      .eq("feature", feature);

    if (error) {
      console.warn("[entitlements] lookup failed, failing OPEN:", error.message);
      return true;
    }

    const now = Date.now();
    return (data ?? []).some(
      (row) => !row.expires_at || new Date(row.expires_at).getTime() > now
    );
  } catch (err) {
    console.warn(
      "[entitlements] lookup threw, failing OPEN:",
      err instanceof Error ? err.message : String(err)
    );
    return true;
  }
}

/** 402 with copy that says what is locked and what unlocks it. */
export function paywallResponse(feature: Feature): Response {
  return new Response(
    JSON.stringify({
      error: "This feature needs an active plan.",
      feature,
      upgrade: "/account",
    }),
    { status: 402, headers: { "Content-Type": "application/json" } }
  );
}
