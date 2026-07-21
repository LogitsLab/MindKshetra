import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUserId } from "@/lib/supabase/server";

export type UserPreferences = {
  votdEmailEnabled: boolean;
  displayName: string;
  dateOfBirth: string | null;
  place: string;
  preferredLanguage: "en" | "hi" | null;
  about: string;
  email: string | null;
};

const DEFAULTS = {
  votdEmailEnabled: true,
  displayName: "",
  dateOfBirth: null as string | null,
  place: "",
  preferredLanguage: null as "en" | "hi" | null,
  about: "",
};

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
  } | null,
  email: string | null
): UserPreferences {
  return {
    votdEmailEnabled: data?.votd_email_enabled ?? DEFAULTS.votdEmailEnabled,
    displayName: data?.display_name ?? "",
    dateOfBirth: data?.date_of_birth ?? null,
    place: data?.place ?? "",
    preferredLanguage: normalizeLang(data?.preferred_language),
    about: data?.about ?? "",
    email,
  };
}

export async function GET() {
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
    .select(
      "votd_email_enabled, display_name, date_of_birth, place, preferred_language, about"
    )
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
    .select(
      "votd_email_enabled, display_name, date_of_birth, place, preferred_language, about"
    )
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
    updated_at: new Date().toISOString(),
  };

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
    typeof body.about === "string";

  if (!hasAnyField) {
    return NextResponse.json(
      { error: "Provide at least one preference or profile field" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(next, { onConflict: "user_id" })
    .select(
      "votd_email_enabled, display_name, date_of_birth, place, preferred_language, about"
    )
    .single();

  if (error) {
    console.warn("[prefs] write failed", error.message);
    return NextResponse.json(
      {
        error:
          "Could not save. Apply supabase/migrations/004_user_prefs.sql and 005_user_profile.sql in the Supabase SQL editor.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(mapRow(data, user?.email ?? null));
}
