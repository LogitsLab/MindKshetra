import "server-only";
import { resolveContinueFromOrderedIds } from "@/lib/continue-sloka";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";
import { getAllSlokas, getSlokaById } from "@/lib/slokas";

export type ReadingCursor = {
  slokaId: number;
  chapter: number;
  updatedAt: string;
};

export type ProgressSnapshot = {
  cursor: ReadingCursor | null;
  completedIds: number[];
  continueSlokaId: number | null;
};

/** Next incomplete verse after cursor (chapter order), or cursor if incomplete. */
export async function resolveContinueSlokaId(
  cursorSlokaId: number | null,
  completedIds: number[]
): Promise<number | null> {
  const all = await getAllSlokas();
  const sorted = [...all].sort((a, b) =>
    a.chapter === b.chapter
      ? a.verse_number - b.verse_number
      : a.chapter - b.chapter
  );
  return resolveContinueFromOrderedIds(
    sorted.map((s) => s.id),
    cursorSlokaId,
    completedIds
  );
}

export async function getProgressForUser(
  userId: string
): Promise<ProgressSnapshot> {
  const supabase = await createClient();

  const [{ data: cursorRow }, { data: completionRows }] = await Promise.all([
    supabase
      .from("reading_cursor")
      .select("last_sloka_id, last_chapter, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("verse_completions")
      .select("sloka_id")
      .eq("user_id", userId),
  ]);

  const completedIds = (completionRows ?? []).map((r) => Number(r.sloka_id));
  let cursor: ReadingCursor | null = null;
  if (cursorRow?.last_sloka_id) {
    cursor = {
      slokaId: Number(cursorRow.last_sloka_id),
      chapter: Number(cursorRow.last_chapter ?? 0),
      updatedAt: cursorRow.updated_at ?? new Date().toISOString(),
    };
  }

  const continueSlokaId = await resolveContinueSlokaId(
    cursor?.slokaId ?? null,
    completedIds
  );

  return { cursor, completedIds, continueSlokaId };
}

export async function getSignedInProgress(): Promise<ProgressSnapshot | null> {
  const userId = await getSignedInUserId();
  if (!userId) return null;
  try {
    return await getProgressForUser(userId);
  } catch {
    return null;
  }
}

export async function setCursor(
  userId: string,
  slokaId: number
): Promise<{ ok: true } | { error: string }> {
  const sloka = await getSlokaById(slokaId);
  if (!sloka) return { error: "Sloka not found" };

  const supabase = await createClient();
  const { error } = await supabase.from("reading_cursor").upsert({
    user_id: userId,
    last_sloka_id: slokaId,
    last_chapter: sloka.chapter,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function setCompletion(
  userId: string,
  slokaId: number,
  completed: boolean
): Promise<{ ok: true } | { error: string }> {
  const sloka = await getSlokaById(slokaId);
  if (!sloka) return { error: "Sloka not found" };

  const supabase = await createClient();
  if (completed) {
    const { error } = await supabase.from("verse_completions").upsert({
      user_id: userId,
      sloka_id: slokaId,
      completed_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("verse_completions")
      .delete()
      .eq("user_id", userId)
      .eq("sloka_id", slokaId);
    if (error) return { error: error.message };
  }
  return { ok: true };
}

export async function setCompletionsBulk(
  userId: string,
  slokaIds: number[],
  completed: boolean
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (completed) {
    const rows = slokaIds.map((sloka_id) => ({
      user_id: userId,
      sloka_id,
      completed_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("verse_completions").upsert(rows);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("verse_completions")
      .delete()
      .eq("user_id", userId)
      .in("sloka_id", slokaIds);
    if (error) return { error: error.message };
  }
  return { ok: true };
}

/** Merge guest local progress into signed-in account. */
export async function mergeGuestProgress(
  userId: string,
  payload: {
    cursor?: { slokaId: number; chapter?: number } | null;
    completedIds?: number[];
  }
): Promise<ProgressSnapshot> {
  if (payload.cursor?.slokaId) {
    await setCursor(userId, payload.cursor.slokaId);
  }
  const ids = (payload.completedIds ?? []).filter((id) =>
    Number.isInteger(id)
  );
  if (ids.length) {
    await setCompletionsBulk(userId, ids, true);
  }
  return getProgressForUser(userId);
}
