import { NextRequest, NextResponse } from "next/server";
import {
  EMPTY_PERSONALIZATION,
  ONBOARDING_VERSION,
  sanitizeDailyTime,
  sanitizeGoals,
  sanitizeInspirations,
  isGuidanceStyleId,
  type GuidanceStyleId,
} from "@/lib/personalization";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getAuthUserId } from "@/lib/supabase/server";

/**
 * POST /api/account/onboarding/complete
 * Atomic write of personalization + onboarding flags.
 * Works for signed-in users (including anonymous Supabase).
 */
export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const skipped = Boolean(body.skipped);
  const goals = sanitizeGoals(body.goals);
  const inspirations = sanitizeInspirations(body.inspirations);
  const dailyTimeMinutes =
    sanitizeDailyTime(body.dailyTimeMinutes) ??
    (skipped ? EMPTY_PERSONALIZATION.dailyTimeMinutes : null);
  const guidanceStyle: GuidanceStyleId | null =
    typeof body.guidanceStyle === "string" && isGuidanceStyleId(body.guidanceStyle)
      ? body.guidanceStyle
      : skipped
        ? "balanced"
        : null;
  const displayName =
    typeof body.displayName === "string"
      ? body.displayName.trim().slice(0, 80) || null
      : null;
  const preferredLanguage =
    body.preferredLanguage === "hi" || body.preferredLanguage === "en"
      ? body.preferredLanguage
      : null;

  const supabase = await createClient();
  const now = new Date().toISOString();

  const row = {
    user_id: userId,
    goals,
    inspirations,
    daily_time_minutes: dailyTimeMinutes,
    guidance_style: guidanceStyle,
    display_name: displayName,
    preferred_language: preferredLanguage,
    onboarding_version: ONBOARDING_VERSION,
    onboarding_completed_at: now,
    onboarding_skipped: skipped,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(row, { onConflict: "user_id" })
    .select(
      "goals, inspirations, daily_time_minutes, guidance_style, display_name, preferred_language, onboarding_version, onboarding_completed_at, onboarding_skipped"
    )
    .single();

  if (error) {
    console.warn("[onboarding/complete]", error.message);
    return NextResponse.json(
      {
        error:
          "Could not save onboarding. Apply supabase/migrations/021_personalization_achievements.sql.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    goals: data.goals ?? [],
    inspirations: data.inspirations ?? [],
    dailyTimeMinutes: data.daily_time_minutes,
    guidanceStyle: data.guidance_style,
    displayName: data.display_name ?? "",
    preferredLanguage: data.preferred_language,
    onboardingVersion: data.onboarding_version,
    onboardingCompletedAt: data.onboarding_completed_at,
    onboardingSkipped: data.onboarding_skipped,
  });
}
