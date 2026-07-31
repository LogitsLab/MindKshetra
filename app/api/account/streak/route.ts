import { NextRequest, NextResponse } from "next/server";
import { getStreak, isValidTimezone, recordVisit } from "@/lib/streaks";
import { getAuthUserId } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ current: 0, longest: 0 });
  }
  const streak = await getStreak(userId);
  return NextResponse.json(streak);
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  // Clients may send their device zone so the day boundary is local even
  // before the user has a stored preference.
  const body = await request.json().catch(() => ({}));
  const timezone = isValidTimezone(body?.timezone) ? body.timezone : undefined;
  const streak = await recordVisit(userId, timezone);
  return NextResponse.json(streak);
}
