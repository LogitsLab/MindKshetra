import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";
import { getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Permanently deletes the calling user's account and data (App Store
 * 5.1.1(v)). Most tables cascade from auth.users; the exceptions are handled
 * explicitly first, and the auth user is deleted LAST so a partial failure
 * never leaves an account that exists but can't be re-deleted.
 */
export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const rl = await rateLimit(`account:delete:${clientKey(request)}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Account deletion is not configured on this server" },
      { status: 503 }
    );
  }

  // chat_sessions.user_id is ON DELETE SET NULL — deleting the auth user
  // would orphan the sessions and keep their messages. Delete them first
  // (chat_messages cascade from chat_sessions).
  const { error: chatError } = await admin
    .from("chat_sessions")
    .delete()
    .eq("user_id", userId);
  if (chatError) {
    console.error("[account/delete] chat cleanup failed:", chatError.message);
    return NextResponse.json(
      { error: "Deletion failed — nothing was removed. Try again." },
      { status: 500 }
    );
  }

  // app_events.user_id has no FK; scrub it for a clean erasure.
  await admin.from("app_events").delete().eq("user_id", userId);

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("[account/delete] auth delete failed:", authError.message);
    return NextResponse.json(
      { error: "Deletion failed. Try again or contact the maintainers." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
