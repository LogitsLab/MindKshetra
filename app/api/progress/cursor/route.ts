import { NextRequest, NextResponse } from "next/server";
import { getSignedInUserId } from "@/lib/supabase/server";
import { setCursor } from "@/lib/progress";

export async function PUT(request: NextRequest) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const slokaId = Number(body.slokaId);
  if (!Number.isInteger(slokaId)) {
    return NextResponse.json({ error: "Invalid slokaId" }, { status: 400 });
  }

  const result = await setCursor(userId, slokaId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
