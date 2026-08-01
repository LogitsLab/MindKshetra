import { NextRequest, NextResponse } from "next/server";
import { loadPracticePath } from "@/lib/paths";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/paths/[id]/run — current progress for the signed-in user. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const pathDef = loadPracticePath(id);
  if (!pathDef) {
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }

  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({
      pathId: id,
      currentDay: 1,
      completedDays: [] as number[],
      guest: true,
    });
  }

  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("path_runs")
    .select("current_day, completed_days, started_at, updated_at")
    .eq("user_id", userId)
    .eq("path_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pathId: id,
    currentDay: data?.current_day ?? 1,
    completedDays: (data?.completed_days as number[] | null) ?? [],
    startedAt: data?.started_at ?? null,
    updatedAt: data?.updated_at ?? null,
    guest: false,
  });
}

/** POST /api/paths/[id]/run — mark a day complete (body: { day: number }). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const pathDef = loadPracticePath(id);
  if (!pathDef) {
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }

  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to save path progress" },
      { status: 401 }
    );
  }

  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;

  const body = (await req.json().catch(() => ({}))) as { day?: unknown };
  const day = typeof body.day === "number" ? body.day : Number(body.day);
  if (!Number.isInteger(day) || day < 1 || day > pathDef.days_count) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("path_runs")
    .select("current_day, completed_days")
    .eq("user_id", userId)
    .eq("path_id", id)
    .maybeSingle();

  const completed = new Set<number>(
    (existing?.completed_days as number[] | null) ?? []
  );
  completed.add(day);
  const completedDays = Array.from(completed).sort((a, b) => a - b);
  const nextDay = Math.min(
    pathDef.days_count,
    Math.max(existing?.current_day ?? 1, day + 1)
  );

  const { data, error } = await supabase
    .from("path_runs")
    .upsert(
      {
        user_id: userId,
        path_id: id,
        current_day: nextDay,
        completed_days: completedDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,path_id" }
    )
    .select("current_day, completed_days, started_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pathId: id,
    currentDay: data.current_day,
    completedDays: data.completed_days,
    startedAt: data.started_at,
    updatedAt: data.updated_at,
    guest: false,
  });
}
