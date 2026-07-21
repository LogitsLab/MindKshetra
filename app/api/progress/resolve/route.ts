import { NextRequest, NextResponse } from "next/server";
import { resolveContinueSlokaId } from "@/lib/progress";

/** Resolve continue target without auth (for guest localStorage progress). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cursorSlokaId = Number(body.cursorSlokaId);
  const completedIds = Array.isArray(body.completedIds)
    ? body.completedIds.map(Number).filter((n: number) => Number.isInteger(n))
    : [];

  if (!Number.isInteger(cursorSlokaId)) {
    return NextResponse.json({ continueSlokaId: null });
  }

  const continueSlokaId = await resolveContinueSlokaId(
    cursorSlokaId,
    completedIds
  );
  return NextResponse.json({ continueSlokaId });
}
