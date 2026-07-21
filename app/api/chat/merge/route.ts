import { NextRequest, NextResponse } from "next/server";
import { assignSessionToUser } from "@/lib/chat-store";
import { getAuthUserId } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId as string | undefined;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  await assignSessionToUser(sessionId, userId);
  return NextResponse.json({ ok: true });
}
