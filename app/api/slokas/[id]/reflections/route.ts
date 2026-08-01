import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getAuthUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Shared reflections on a verse. Migration 016 dropped the public SELECT
 * policy on journal_entries, so this read runs on the service role and the
 * API is the only public read path. The viewer's block list is an API-layer
 * read filter on top. Authors without a public profile appear as "A seeker"
 * — sharing words never forces sharing identity.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // The public read path runs on the service role (migration 016).
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;
  const rl = await rateLimit(`reflections:${clientKey(request)}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ reflections: [] }, { status: 429 });
  }

  const slokaId = Number(params.id);
  if (!Number.isInteger(slokaId)) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }

  // Service role BYPASSES RLS: the visibility/status filters below are the
  // security boundary for private journals now — never remove or widen them.
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("journal_entries")
    .select("id, user_id, reflection, shared_at")
    .eq("sloka_id", slokaId)
    .eq("visibility", "shared")
    .eq("status", "published")
    .order("shared_at", { ascending: false })
    .limit(20);

  let entries = rows ?? [];
  if (!entries.length) {
    return NextResponse.json(
      { reflections: [] },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  }

  // Blocks and profiles stay on the request-scoped client: user_blocks RLS
  // is own-row, and public_profiles keeps its public-read policy (013) — no
  // reason to widen either read to the service role.
  const supabase = await createClient();
  const viewerId = await getAuthUserId();
  if (viewerId) {
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("blocked_user_id")
      .eq("user_id", viewerId);
    const blocked = new Set((blocks ?? []).map((b) => b.blocked_user_id));
    entries = entries.filter((e) => !blocked.has(e.user_id));
  }

  const authorIds = Array.from(new Set(entries.map((e) => e.user_id)));
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("user_id, handle, display_name")
    .in("user_id", authorIds)
    .eq("is_public", true);
  const profileByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  return NextResponse.json({
    reflections: entries.map((e) => {
      const profile = profileByUser.get(e.user_id);
      return {
        id: String(e.id),
        reflection: e.reflection,
        sharedAt: e.shared_at,
        author: profile
          ? { handle: profile.handle, displayName: profile.display_name }
          : null,
      };
    }),
  });
}
