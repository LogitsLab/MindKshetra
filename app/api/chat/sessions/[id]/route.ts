import { NextResponse } from "next/server";
import { getChatSession } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const messages = await getChatSession(params.id);
  return NextResponse.json({ sessionId: params.id, messages });
}
