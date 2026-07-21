import { NextRequest, NextResponse } from "next/server";
import { getSignedInUserId } from "@/lib/supabase/server";
import { mergeGuestProgress } from "@/lib/progress";

export async function POST(request: NextRequest) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const cursor =
    body.cursor && Number.isInteger(Number(body.cursor.slokaId))
      ? {
          slokaId: Number(body.cursor.slokaId),
          chapter: Number(body.cursor.chapter) || undefined,
        }
      : null;
  const completedIds = Array.isArray(body.completedIds)
    ? body.completedIds.map(Number).filter((n: number) => Number.isInteger(n))
    : [];

  try {
    const progress = await mergeGuestProgress(userId, {
      cursor,
      completedIds,
    });
    return NextResponse.json(progress);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
