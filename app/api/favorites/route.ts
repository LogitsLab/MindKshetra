import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/server";
import { getSlokaById } from "@/lib/slokas";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("sloka_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const slokas = [];
  for (const row of data ?? []) {
    const sloka = await getSlokaById(row.sloka_id);
    if (sloka) slokas.push(sloka);
  }

  return NextResponse.json({ slokas });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const slokaId = Number(body.slokaId);
  if (!Number.isInteger(slokaId)) {
    return NextResponse.json({ error: "Invalid slokaId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("favorites")
    .upsert({ user_id: userId, sloka_id: slokaId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const slokaId = Number(request.nextUrl.searchParams.get("slokaId"));
  if (!Number.isInteger(slokaId)) {
    return NextResponse.json({ error: "Invalid slokaId" }, { status: 400 });
  }

  const supabase = await createClient();
  await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("sloka_id", slokaId);

  return NextResponse.json({ ok: true });
}
