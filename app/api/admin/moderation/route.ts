import { NextRequest, NextResponse } from "next/server";
import { isMaintainer } from "@/lib/maintainers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Maintainer review queue. Humans decide; the screen and (future) LLM
 * triage only prioritize. Resolving a held reflection either publishes it
 * (kept) or removes it — removal flips status, never deletes the author's
 * private journal entry.
 */
export async function GET() {
  const userId = await getSignedInUserId();
  if (!isMaintainer(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("moderation_queue")
    .select(
      "id, content_type, content_id, reason, source, llm_suggestion, status, created_at"
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(50);

  // Preview reflections inline so review doesn't need SQL.
  const reflectionIds = (items ?? [])
    .filter((i) => i.content_type === "reflection")
    .map((i) => Number(i.content_id))
    .filter((n) => Number.isInteger(n));
  const previews = new Map<string, string>();
  if (reflectionIds.length) {
    const { data: rows } = await admin
      .from("journal_entries")
      .select("id, reflection")
      .in("id", reflectionIds);
    for (const row of rows ?? []) {
      previews.set(String(row.id), row.reflection as string);
    }
  }

  return NextResponse.json({
    items: (items ?? []).map((item) => ({
      ...item,
      preview:
        item.content_type === "reflection"
          ? (previews.get(item.content_id) ?? null)
          : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const userId = await getSignedInUserId();
  if (!isMaintainer(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const resolution = body?.resolution;
  if (
    typeof id !== "string" ||
    !["kept", "removed", "no_action"].includes(resolution)
  ) {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("moderation_queue")
    .select("id, content_type, content_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!item || item.status !== "open") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.content_type === "reflection") {
    const entryId = Number(item.content_id);
    if (Number.isInteger(entryId)) {
      if (resolution === "kept") {
        await admin
          .from("journal_entries")
          .update({ status: "published", held_reason: null })
          .eq("id", entryId);
      } else if (resolution === "removed") {
        await admin
          .from("journal_entries")
          .update({ status: "removed" })
          .eq("id", entryId);
      }
    }
  }

  await admin
    .from("moderation_queue")
    .update({
      status: "resolved",
      resolution,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  await admin.from("moderation_actions").insert({
    actor: userId,
    action: `queue:${resolution}`,
    content_type: item.content_type,
    content_id: item.content_id,
  });

  return NextResponse.json({ ok: true });
}
