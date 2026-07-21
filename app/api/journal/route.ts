import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, sloka_id, reflection, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const slokaId = Number(body.slokaId);
  const reflection = String(body.reflection ?? "").trim();
  if (!Number.isInteger(slokaId) || !reflection) {
    return NextResponse.json({ error: "slokaId and reflection required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ user_id: userId, sloka_id: slokaId, reflection })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
