import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/events";
import { requireSupabase } from "@/lib/supabase/require";
import { getSignedInUserId } from "@/lib/supabase/server";
import { setCompletion, setCompletionsBulk } from "@/lib/progress";

export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const slokaIds = Array.isArray(body.slokaIds)
    ? body.slokaIds.map(Number).filter((n: number) => Number.isInteger(n))
    : null;
  const slokaId = Number(body.slokaId);
  // Legacy clients omit `completed` when marking done — default true when a
  // target id is present so a missing field never silently un-completes.
  const completed =
    typeof body.completed === "boolean"
      ? body.completed
      : Boolean(slokaIds?.length || Number.isInteger(slokaId));

  if (slokaIds?.length) {
    const result = await setCompletionsBulk(userId, slokaIds, completed);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (completed) {
      await recordEvent("verse_completed", userId, { count: slokaIds.length });
    }
    return NextResponse.json({ ok: true });
  }

  if (!Number.isInteger(slokaId)) {
    return NextResponse.json({ error: "Invalid slokaId" }, { status: 400 });
  }

  const result = await setCompletion(userId, slokaId, completed);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  if (completed) {
    await recordEvent("verse_completed", userId, { slokaId });
  }
  return NextResponse.json({ ok: true });
}
