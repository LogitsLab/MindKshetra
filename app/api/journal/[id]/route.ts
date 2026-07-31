import { NextRequest, NextResponse } from "next/server";
import { crisisResponse } from "@/lib/crisis";
import { recordEvent } from "@/lib/events";
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
 *
 * Since migration 016 the publishing columns (visibility, status,
 * held_reason, shared_at) are service-role-only, so every share-state write
 * below uses the admin client — but only after the user-scoped ownership
 * select, and always filtered by id AND user_id.
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
  // Kill switch pauses NEW sharing only; unsharing must always work.
  if (
    visibility === "shared" &&
    process.env.COMMUNITY_REFLECTIONS_ENABLED === "0"
  ) {
    return NextResponse.json(
      { error: "Sharing is paused right now." },
      { status: 503 }
    );
  }
  const lang = body?.language === "hi" ? "hi" : "en";

  const supabase = await createClient();
  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .select("id, reflection")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (entryError) {
    return NextResponse.json({ error: "Could not load entry" }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  if (visibility === "private") {
    const { error: unshareError } = await admin
      .from("journal_entries")
      .update({ visibility: "private", shared_at: null })
      .eq("id", entryId)
      .eq("user_id", userId);
    if (unshareError) {
      return NextResponse.json({ error: "Could not update" }, { status: 500 });
    }
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
    const { error: holdError } = await admin
      .from("journal_entries")
      .update({
        visibility: "shared",
        status: "held",
        held_reason: screen.reason,
        shared_at: now,
      })
      .eq("id", entryId)
      .eq("user_id", userId);
    if (holdError) {
      return NextResponse.json({ error: "Could not update" }, { status: 500 });
    }

    // One open queue row per held entry — retries and re-shares must not
    // stack duplicates. A failed pre-check just falls through to the insert.
    const { data: existingHold } = await admin
      .from("moderation_queue")
      .select("id")
      .eq("content_type", "reflection")
      .eq("content_id", String(entryId))
      .eq("status", "open")
      .eq("source", "screen_hold")
      .limit(1)
      .maybeSingle();

    if (!existingHold) {
      const { error: queueError } = await admin.from("moderation_queue").insert({
        content_type: "reflection",
        content_id: String(entryId),
        source: "screen_hold",
        reason: screen.reason,
      });
      if (queueError) {
        // Care path: a held entry with no queue row would never reach a
        // human. Fail loudly so the client retries (the hold update above is
        // idempotent).
        console.error(
          `[journal:share] moderation_queue insert failed for held entry ${entryId}:`,
          queueError.message
        );
        return NextResponse.json({ error: "Could not share" }, { status: 500 });
      }
    }

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

  const { error: publishError } = await admin
    .from("journal_entries")
    .update({
      visibility: "shared",
      status: "published",
      held_reason: null,
      shared_at: now,
    })
    .eq("id", entryId)
    .eq("user_id", userId);
  if (publishError) {
    return NextResponse.json({ error: "Could not share" }, { status: 500 });
  }

  await recordEvent("reflection_shared", userId, { entryId });

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
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
