import { NextRequest, NextResponse } from "next/server";
import { requireSupabase } from "@/lib/supabase/require";
import { createClient, getAuthUserId } from "@/lib/supabase/server";

const KINDS = new Set(["verse", "reflection", "gratitude", "insight"]);

export async function GET(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const kind = request.nextUrl.searchParams.get("kind");
  const supabase = await createClient();
  let q = supabase
    .from("journal_entries")
    .select("id, sloka_id, reflection, kind, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (kind && KINDS.has(kind)) {
    q = q.eq("kind", kind);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase();
  if (unconfigured) return unconfigured;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reflection = String(body.reflection ?? "").trim();
  const kindRaw = typeof body.kind === "string" ? body.kind : "verse";
  const kind = KINDS.has(kindRaw) ? kindRaw : "verse";

  if (!reflection) {
    return NextResponse.json({ error: "reflection required" }, { status: 400 });
  }

  let slokaId: number | null = null;
  if (body.slokaId != null && body.slokaId !== "") {
    const n = Number(body.slokaId);
    if (!Number.isInteger(n)) {
      return NextResponse.json({ error: "invalid slokaId" }, { status: 400 });
    }
    slokaId = n;
  }

  if (kind === "verse" && slokaId == null) {
    return NextResponse.json(
      { error: "slokaId required for verse journal entries" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      sloka_id: slokaId,
      reflection,
      kind,
    })
    .select("id, kind")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, kind: data.kind });
}
