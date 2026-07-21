import { NextResponse } from "next/server";
import { getSignedInUserId } from "@/lib/supabase/server";
import { getProgressForUser } from "@/lib/progress";

export async function GET() {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const progress = await getProgressForUser(userId);
    return NextResponse.json(progress);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Progress failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
