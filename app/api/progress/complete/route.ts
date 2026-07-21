import { NextRequest, NextResponse } from "next/server";
import { getSignedInUserId } from "@/lib/supabase/server";
import { setCompletion, setCompletionsBulk } from "@/lib/progress";

export async function POST(request: NextRequest) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const completed = Boolean(body.completed);
  const slokaIds = Array.isArray(body.slokaIds)
    ? body.slokaIds.map(Number).filter((n: number) => Number.isInteger(n))
    : null;
  const slokaId = Number(body.slokaId);

  if (slokaIds?.length) {
    const result = await setCompletionsBulk(userId, slokaIds, completed);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!Number.isInteger(slokaId)) {
    return NextResponse.json({ error: "Invalid slokaId" }, { status: 400 });
  }

  const result = await setCompletion(userId, slokaId, completed);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
