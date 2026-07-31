import { NextResponse } from "next/server";
import { getAuthUserId, createClient } from "@/lib/supabase/server";
import { getSlokasByIds } from "@/lib/slokas";
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

  const refIds = new Set<number>();
  for (const row of favRows ?? []) refIds.add(row.sloka_id);
  for (const row of journalRows ?? []) refIds.add(row.sloka_id);
  const refById = new Map(
    (await getSlokasByIds(Array.from(refIds))).map((s) => [
      s.id,
      formatVerseRef(s),
    ])
  );

  const favorites = (favRows ?? []).map((row) => ({
    slokaId: row.sloka_id,
    ref: refById.get(row.sloka_id) ?? null,
    createdAt: row.created_at,
  }));

  const reflections = (journalRows ?? []).map((row) => ({
    id: row.id,
    slokaId: row.sloka_id,
    ref: refById.get(row.sloka_id) ?? null,
    reflection: row.reflection,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const sessionRows = sessions ?? [];
  const { data: allMessages } = sessionRows.length
    ? await supabase
        .from("chat_messages")
        .select("session_id, role, content, cited_sloka_ids, created_at")
        .in(
          "session_id",
          sessionRows.map((s) => s.id)
        )
        .order("created_at", { ascending: true })
    : { data: [] };

  const messagesBySession = new Map<string, object[]>();
  for (const { session_id, ...message } of allMessages ?? []) {
    const list = messagesBySession.get(session_id) ?? [];
    list.push(message);
    messagesBySession.set(session_id, list);
  }

  const chats = sessionRows.map((session) => ({
    id: session.id,
    title: session.title,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    messages: messagesBySession.get(session.id) ?? [],
  }));

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
