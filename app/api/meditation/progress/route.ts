import { NextRequest, NextResponse } from "next/server";
import { FOUNDATION_PROGRAM_ID } from "@/lib/meditation";
import { getMeditationProgress } from "@/lib/meditation-progress";
import { requireSupabase } from "@/lib/supabase/require";
import { getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/meditation/progress?program=foundation-7 */
export async function GET(request: NextRequest) {
  const program =
    request.nextUrl.searchParams.get("program") ?? FOUNDATION_PROGRAM_ID;
  if (!/^[a-z0-9-]+$/i.test(program)) {
    return NextResponse.json({ error: "Invalid program" }, { status: 400 });
  }

  const userId = await getSignedInUserId();
  if (userId) {
    const unconfigured = requireSupabase();
    if (unconfigured) return unconfigured;
  }

  const progress = await getMeditationProgress(userId, program);
  return NextResponse.json(progress);
}
