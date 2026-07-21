import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isDbContentEnabled } from "@/lib/content/source";

export type ChatSession = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at?: string;
};

export type StoredChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  cited_sloka_ids: number[];
  created_at: string;
};

async function getDb() {
  if (!isDbContentEnabled()) return null;
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

export async function createChatSession(
  userId?: string | null,
  title?: string
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("chat_sessions")
    .insert({ user_id: userId ?? null, title: title ?? null })
    .select("id")
    .single();

  if (error) {
    console.warn("[chat] create session failed", error.message);
    return null;
  }
  return data.id as string;
}

export async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  citedSlokaIds: number[] = []
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
    cited_sloka_ids: citedSlokaIds,
  });

  await db
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function getChatSession(
  sessionId: string
): Promise<StoredChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  const { data, error } = await db
    .from("chat_messages")
    .select("id, role, content, cited_sloka_ids, created_at")
    .eq("session_id", sessionId)
    .order("created_at");

  if (error) return [];
  return (data ?? []) as StoredChatMessage[];
}

export async function listChatSessions(
  userId?: string | null,
  limit = 10
): Promise<ChatSession[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as ChatSession[];
}

export async function assignSessionToUser(
  sessionId: string,
  userId: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .from("chat_sessions")
    .update({ user_id: userId })
    .eq("id", sessionId)
    .is("user_id", null);
}
