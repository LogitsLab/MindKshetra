import { NextRequest, NextResponse } from "next/server";
import { getChatSession, listChatSessions } from "@/lib/chat-store";
import { getAuthUserId } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const userId = await getAuthUserId();

  if (sessionId) {
    const messages = await getChatSession(sessionId);
    return NextResponse.json({ sessionId, messages });
  }

  const sessions = await listChatSessions(userId, 10);
  return NextResponse.json({ sessions });
}
