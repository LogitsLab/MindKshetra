import { NextRequest, NextResponse } from "next/server";
import {
  isGuidanceStyleId,
  sanitizeDailyTime,
  sanitizeGoals,
  sanitizeInspirations,
  type GuidanceStyleId,
  type GoalId,
  type InspirationId,
} from "@/lib/personalization";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getAuthUserId } from "@/lib/supabase/server";
import { isValidTimezone } from "@/lib/streaks";

export type UserPreferences = {
  votdEmailEnabled: boolean;
  displayName: string;
  dateOfBirth: string | null;
  place: string;
  preferredLanguage: "en" | "hi" | null;
  about: string;
  timezone: string | null;
  email: string | null;
  notifDailyVerse: boolean;
  notifDailyVerseHour: number;
  notifStreakReminder: boolean;
  notifCommunity: boolean;
  goals: GoalId[];
  inspirations: InspirationId[];
  dailyTimeMinutes: number | null;
  guidanceStyle: GuidanceStyleId | null;
  onboardingVersion: number;
  onboardingCompletedAt: string | null;
  onboardingSkipped: boolean;
};

const DEFAULTS = {
  votdEmailEnabled: true,
  displayName: "",
  dateOfBirth: null as string | null,
  place: "",
  preferredLanguage: null as "en" | "hi" | null,
  about: "",
  timezone: null as string | null,
  notifDailyVerse: false,
  notifDailyVerseHour: 8,
  notifStreakReminder: false,
  notifCommunity: true,
  goals: [] as GoalId[],
  inspirations: [] as InspirationId[],
  dailyTimeMinutes: null as number | null,
  guidanceStyle: null as GuidanceStyleId | null,
  onboardingVersion: 0,
  onboardingCompletedAt: null as string | null,
  onboardingSkipped: false,
};

const PREF_COLUMNS =
  "votd_email_enabled, display_name, date_of_birth, place, preferred_language, about, timezone, notif_daily_verse, notif_daily_verse_hour, notif_streak_reminder, notif_community, goals, inspirations, daily_time_minutes, guidance_style, onboarding_version, onboarding_completed_at, onboarding_skipped";

function normalizeLang(value: unknown): "en" | "hi" | null {
  if (value === "en" || value === "hi") return value;
  if (value === "" || value == null) return null;
  return null;
}

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

function mapRow(
  data: {
    votd_email_enabled?: boolean | null;
    display_name?: string | null;
    date_of_birth?: string | null;
    place?: string | null;
    preferred_language?: string | null;
    about?: string | null;
    timezone?: string | null;
    notif_daily_verse?: boolean | null;
    notif_daily_verse_hour?: number | null;
    notif_streak_reminder?: boolean | null;
    notif_community?: boolean | null;
    goals?: string[] | null;
    inspirations?: string[] | null;
    daily_time_minutes?: number | null;
    guidance_style?: string | null;
    onboarding_version?: number | null;
    onboarding_completed_at?: string | null;
    onboarding_skipped?: boolean | null;
  } | null,
  email: string | null
): UserPreferences {
  const guidance =
    data?.guidance_style && isGuidanceStyleId(data.guidance_style)
      ? data.guidance_style
      : null;
  return {
    votdEmailEnabled: data?.votd_email_enabled ?? DEFAULTS.votdEmailEnabled,
    displayName: data?.display_name ?? "",
    dateOfBirth: data?.date_of_birth ?? null,
    place: data?.place ?? "",
    preferredLanguage: normalizeLang(data?.preferred_language),
    about: data?.about ?? "",
    timezone: data?.timezone ?? null,
    email,
    notifDailyVerse: data?.notif_daily_verse ?? DEFAULTS.notifDailyVerse,
    notifDailyVerseHour:
      data?.notif_daily_verse_hour ?? DEFAULTS.notifDailyVerseHour,
    notifStreakReminder:
      data?.notif_streak_reminder ?? DEFAULTS.notifStreakReminder,
    notifCommunity: data?.notif_community ?? DEFAULTS.notifCommunity,
    goals: sanitizeGoals(data?.goals ?? []),
    inspirations: sanitizeInspirations(data?.inspirations ?? []),
    dailyTimeMinutes: sanitizeDailyTime(data?.daily_time_minutes ?? null),
    guidanceStyle: guidance,
    onboardingVersion: data?.onboarding_version ?? 0,
    onboardingCompletedAt: data?.onboarding_completed_at ?? null,
    onboardingSkipped: data?.onboarding_skipped ?? false,
  };
}

export async function GET() {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("user_preferences")
    .select(PREF_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[prefs] read failed", error.message);
    return NextResponse.json({
      ...DEFAULTS,
      email: user?.email ?? null,
    } satisfies UserPreferences);
  }

  return NextResponse.json(mapRow(data, user?.email ?? null));
}

export async function PATCH(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("user_preferences")
    .select(PREF_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  const next = {
    user_id: userId,
    votd_email_enabled:
      typeof body.votdEmailEnabled === "boolean"
        ? body.votdEmailEnabled
        : (existing?.votd_email_enabled ?? DEFAULTS.votdEmailEnabled),
    display_name:
      typeof body.displayName === "string"
        ? emptyToNull(body.displayName.slice(0, 80))
        : (existing?.display_name ?? null),
    date_of_birth:
      typeof body.dateOfBirth === "string"
        ? body.dateOfBirth.trim() || null
        : body.dateOfBirth === null
          ? null
          : (existing?.date_of_birth ?? null),
    place:
      typeof body.place === "string"
        ? emptyToNull(body.place.slice(0, 120))
        : (existing?.place ?? null),
    preferred_language:
      body.preferredLanguage !== undefined
        ? normalizeLang(body.preferredLanguage)
        : normalizeLang(existing?.preferred_language),
    about:
      typeof body.about === "string"
        ? emptyToNull(body.about.slice(0, 500))
        : (existing?.about ?? null),
    timezone:
      typeof body.timezone === "string" && isValidTimezone(body.timezone)
        ? body.timezone
        : body.timezone === null
          ? null
          : (existing?.timezone ?? null),
    notif_daily_verse:
      typeof body.notifDailyVerse === "boolean"
        ? body.notifDailyVerse
        : (existing?.notif_daily_verse ?? DEFAULTS.notifDailyVerse),
    notif_daily_verse_hour:
      typeof body.notifDailyVerseHour === "number"
        ? body.notifDailyVerseHour
        : (existing?.notif_daily_verse_hour ?? DEFAULTS.notifDailyVerseHour),
    notif_streak_reminder:
      typeof body.notifStreakReminder === "boolean"
        ? body.notifStreakReminder
        : (existing?.notif_streak_reminder ?? DEFAULTS.notifStreakReminder),
    notif_community:
      typeof body.notifCommunity === "boolean"
        ? body.notifCommunity
        : (existing?.notif_community ?? DEFAULTS.notifCommunity),
    goals:
      body.goals !== undefined
        ? sanitizeGoals(body.goals)
        : sanitizeGoals(existing?.goals ?? []),
    inspirations:
      body.inspirations !== undefined
        ? sanitizeInspirations(body.inspirations)
        : sanitizeInspirations(existing?.inspirations ?? []),
    daily_time_minutes:
      body.dailyTimeMinutes !== undefined
        ? sanitizeDailyTime(body.dailyTimeMinutes)
        : sanitizeDailyTime(existing?.daily_time_minutes ?? null),
    guidance_style:
      body.guidanceStyle !== undefined
        ? typeof body.guidanceStyle === "string" &&
          isGuidanceStyleId(body.guidanceStyle)
          ? body.guidanceStyle
          : null
        : existing?.guidance_style && isGuidanceStyleId(existing.guidance_style)
          ? existing.guidance_style
          : null,
    updated_at: new Date().toISOString(),
  };

  if (
    typeof body.notifDailyVerseHour === "number" &&
    (!Number.isInteger(body.notifDailyVerseHour) ||
      body.notifDailyVerseHour < 4 ||
      body.notifDailyVerseHour > 22)
  ) {
    return NextResponse.json(
      { error: "notifDailyVerseHour must be an integer between 4 and 22" },
      { status: 400 }
    );
  }

  if (typeof body.timezone === "string" && !isValidTimezone(body.timezone)) {
    return NextResponse.json(
      { error: "timezone must be a valid IANA zone" },
      { status: 400 }
    );
  }

  // Validate DOB if present (YYYY-MM-DD, not in the future, not before 1900)
  if (next.date_of_birth) {
    const dob = next.date_of_birth;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return NextResponse.json(
        { error: "dateOfBirth must be YYYY-MM-DD" },
        { status: 400 }
      );
    }
    const d = new Date(`${dob}T00:00:00Z`);
    const now = new Date();
    if (
      Number.isNaN(d.getTime()) ||
      d.getUTCFullYear() < 1900 ||
      d > now
    ) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
    }
  }

  const hasAnyField =
    typeof body.votdEmailEnabled === "boolean" ||
    typeof body.displayName === "string" ||
    typeof body.dateOfBirth === "string" ||
    body.dateOfBirth === null ||
    typeof body.place === "string" ||
    body.preferredLanguage !== undefined ||
    typeof body.about === "string" ||
    typeof body.timezone === "string" ||
    body.timezone === null ||
    typeof body.notifDailyVerse === "boolean" ||
    typeof body.notifDailyVerseHour === "number" ||
    typeof body.notifStreakReminder === "boolean" ||
    typeof body.notifCommunity === "boolean" ||
    body.goals !== undefined ||
    body.inspirations !== undefined ||
    body.dailyTimeMinutes !== undefined ||
    body.guidanceStyle !== undefined;

  if (!hasAnyField) {
    return NextResponse.json(
      { error: "Provide at least one preference or profile field" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(next, { onConflict: "user_id" })
    .select(PREF_COLUMNS)
    .single();

  if (error) {
    console.warn("[prefs] write failed", error.message);
    return NextResponse.json(
      {
        error:
          "Could not save. Apply supabase/migrations/004_user_prefs.sql, 005_user_profile.sql and 010_timezone_and_events.sql in the Supabase SQL editor.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(mapRow(data, user?.email ?? null));
}
