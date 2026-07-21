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
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mindkshetra-export-${userId.slice(0, 8)}.json"`,
    },
  });
}
