import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isDbContentEnabled } from "@/lib/content/source";

export type ChatSession = {
  id: string;
  title: string | null;
  /** First user message snippet for history list. */
  preview: string | null;
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

  const now = new Date().toISOString();
  await db
    .from("chat_sessions")
    .update({ updated_at: now })
    .eq("id", sessionId);

  if (role === "user") {
    const title = makeSessionTitle(content);
    if (title) {
      await db
        .from("chat_sessions")
        .update({ title })
        .eq("id", sessionId)
        .is("title", null);
    }
  }
}

function makeSessionTitle(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return oneLine.length > 72 ? `${oneLine.slice(0, 72).trim()}…` : oneLine;
}

function makePreview(content: string, max = 100): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return oneLine.length > max ? `${oneLine.slice(0, max).trim()}…` : oneLine;
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
  if (!userId) return [];

  const db = await getDb();
  if (!db) return [];

  const { data, error } = await db
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const ids = data.map((s) => s.id as string);
  const { data: msgs } = await db
    .from("chat_messages")
    .select("session_id, content, created_at")
    .in("session_id", ids)
    .eq("role", "user")
    .order("created_at", { ascending: true });

  const firstUserBySession = new Map<string, string>();
  for (const m of msgs ?? []) {
    const sid = m.session_id as string;
    if (!firstUserBySession.has(sid) && typeof m.content === "string") {
      firstUserBySession.set(sid, m.content);
    }
  }

  return data.map((s) => {
    const first = firstUserBySession.get(s.id as string) ?? null;
    const title =
      (typeof s.title === "string" && s.title.trim()) ||
      (first ? makeSessionTitle(first) : null);
    const preview = first ? makePreview(first) : null;
    return {
      id: s.id as string,
      title,
      preview,
      created_at: s.created_at as string,
      updated_at: s.updated_at as string | undefined,
    };
  });
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
