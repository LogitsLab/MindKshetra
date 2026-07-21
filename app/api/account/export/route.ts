import { NextResponse } from "next/server";
import { getAuthUserId, createClient } from "@/lib/supabase/server";
import { getSlokaById } from "@/lib/slokas";
import { formatVerseRef } from "@/lib/sloka-utils";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();

  const [
    { data: favRows },
    { data: journalRows },
    { data: streak },
    { data: sessions },
    { data: prefs },
    { data: cursorRow },
    { data: completionRows },
  ] = await Promise.all([
    supabase
      .from("favorites")
      .select("sloka_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("id, sloka_id, reflection, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, last_visit_date")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("user_preferences")
      .select(
        "votd_email_enabled, display_name, date_of_birth, place, preferred_language, about"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("reading_cursor")
      .select("last_sloka_id, last_chapter, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("verse_completions")
      .select("sloka_id, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false }),
  ]);

  const favorites = [];
  for (const row of favRows ?? []) {
    const sloka = await getSlokaById(row.sloka_id);
    favorites.push({
      slokaId: row.sloka_id,
      ref: sloka ? formatVerseRef(sloka) : null,
      createdAt: row.created_at,
    });
  }

  const reflections = [];
  for (const row of journalRows ?? []) {
    const sloka = await getSlokaById(row.sloka_id);
    reflections.push({
      id: row.id,
      slokaId: row.sloka_id,
      ref: sloka ? formatVerseRef(sloka) : null,
      reflection: row.reflection,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  const chats = [];
  for (const session of sessions ?? []) {
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("role, content, cited_sloka_ids, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    chats.push({
      id: session.id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      messages: messages ?? [],
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    preferences: {
      votdEmailEnabled: prefs?.votd_email_enabled ?? true,
      displayName: prefs?.display_name ?? null,
      dateOfBirth: prefs?.date_of_birth ?? null,
      place: prefs?.place ?? null,
      preferredLanguage: prefs?.preferred_language ?? null,
      about: prefs?.about ?? null,
    },
    streak: streak
      ? {
          current: streak.current_streak,
          longest: streak.longest_streak,
          lastVisitDate: streak.last_visit_date,
        }
      : { current: 0, longest: 0, lastVisitDate: null },
    favorites,
    reflections,
    chats,
    readingProgress: {
      cursor: cursorRow?.last_sloka_id
        ? {
            slokaId: cursorRow.last_sloka_id,
            chapter: cursorRow.last_chapter,
            updatedAt: cursorRow.updated_at,
          }
        : null,
      completed: (completionRows ?? []).map((row) => ({
        slokaId: row.sloka_id,
        completedAt: row.completed_at,
      })),
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mindkshetra-export-${userId.slice(0, 8)}.json"`,
    },
  });
}
