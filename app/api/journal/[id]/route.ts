import { NextRequest, NextResponse } from "next/server";
import { crisisResponse } from "@/lib/crisis";
import { screenText } from "@/lib/moderation";
import { principalKey, rateLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Share / unshare a journal reflection (plan Phase 3).
 *
 * Care-first contract: crisis language in a to-be-shared reflection NEVER
 * hard-blocks or lectures. The content is held (stays private to the author),
 * the author receives the same helpline response the chat crisis path uses,
 * and a maintainer sees it in the queue. Private journaling is never
 * screened at all — only the act of sharing is.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getSignedInUserId();
  const rl = await rateLimit(
    `journal:share:${principalKey(userId, request)}`,
    30,
    3600_000
  );
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const entryId = Number(params.id);
  if (!Number.isInteger(entryId)) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const visibility = body?.visibility;
  if (visibility !== "shared" && visibility !== "private") {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }
  const lang = body?.language === "hi" ? "hi" : "en";

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, reflection")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (visibility === "private") {
    await supabase
      .from("journal_entries")
      .update({ visibility: "private", shared_at: null })
      .eq("id", entryId)
      .eq("user_id", userId);
    return NextResponse.json({ shared: false });
  }

  const screen = screenText(String(entry.reflection ?? ""), 1000);
  if (screen.verdict === "reject") {
    return NextResponse.json(
      {
        error:
          screen.reason === "links"
            ? "Shared reflections can't contain links."
            : "This reflection can't be shared as written.",
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  if (screen.verdict === "hold") {
    await supabase
      .from("journal_entries")
      .update({
        visibility: "shared",
        status: "held",
        held_reason: screen.reason,
        shared_at: now,
      })
      .eq("id", entryId)
      .eq("user_id", userId);

    const admin = createAdminClient();
    await admin.from("moderation_queue").insert({
      content_type: "reflection",
      content_id: String(entryId),
      source: "screen_hold",
      reason: screen.reason,
    });

    if (screen.reason === "crisis") {
      return NextResponse.json({
        shared: false,
        held: true,
        crisis: true,
        message: crisisResponse(lang),
      });
    }
    return NextResponse.json({ shared: false, held: true });
  }

  await supabase
    .from("journal_entries")
    .update({
      visibility: "shared",
      status: "published",
      held_reason: null,
      shared_at: now,
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  return NextResponse.json({ shared: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const entryId = Number(params.id);
  if (!Number.isInteger(entryId)) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }
  const supabase = await createClient();
  await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
