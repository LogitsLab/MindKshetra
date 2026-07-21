import { NextResponse } from "next/server";
import { getStreak, recordVisit } from "@/lib/streaks";
import { getAuthUserId } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ current: 0, longest: 0 });
  }
  const streak = await getStreak(userId);
  return NextResponse.json(streak);
}

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const streak = await recordVisit(userId);
  return NextResponse.json(streak);
}
