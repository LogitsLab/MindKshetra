import { NextRequest, NextResponse } from "next/server";
import { screenText } from "@/lib/moderation";
import { isAvatarKey, isValidHandle } from "@/lib/profiles";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in user's public profile. PUT screens display name and bio
 * before anything becomes publicly readable — a screen hit here is a plain
 * 400 (fix and retry), not a hold queue: nothing exists yet to hold.
 */
export async function GET() {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("handle, display_name, bio, avatar_key, is_public, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  return NextResponse.json({ profile: data ?? null });
}

export async function PUT(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `profile:${principalKey(userId, request)}`,
    10,
    3600_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !isValidHandle(body.handle)) {
    return NextResponse.json(
      { error: "Handle must be 3–24 lowercase letters, digits or _" },
      { status: 400 }
    );
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim().slice(0, 40) : "";
  const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 200) : "";
  for (const text of [displayName, bio]) {
    if (!text) continue;
    const screen = screenText(text, 200);
    if (screen.verdict !== "publish") {
      return NextResponse.json(
        { error: "That text can't be part of a public profile." },
        { status: 400 }
      );
    }
  }

  const supabase = await createClient();

  // A request that omits isPublic must keep the stored value — defaulting to
  // true here would silently re-publicize a hidden profile. True only when
  // no row exists yet.
  const { data: existing, error: existingError } = await supabase
    .from("public_profiles")
    .select("is_public")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json(
      { error: "Could not save profile" },
      { status: 500 }
    );
  }
  const isPublic =
    typeof body.isPublic === "boolean"
      ? body.isPublic
      : existing?.is_public ?? true;

  const { data, error } = await supabase
    .from("public_profiles")
    .upsert(
      {
        user_id: userId,
        handle: body.handle,
        display_name: displayName || null,
        bio: bio || null,
        avatar_key: isAvatarKey(body.avatarKey) ? body.avatarKey : "lotus",
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("handle, display_name, bio, avatar_key, is_public, created_at")
    .single();

  if (error) {
    const taken = error.message.includes("public_profiles_handle_key");
    return NextResponse.json(
      { error: taken ? "That handle is taken." : "Could not save profile" },
      { status: taken ? 409 : 500 }
    );
  }
  return NextResponse.json({ profile: data });
}

export async function DELETE() {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const supabase = await createClient();
  await supabase.from("public_profiles").delete().eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
