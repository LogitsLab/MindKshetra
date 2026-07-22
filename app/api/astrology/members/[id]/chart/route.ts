import { NextRequest, NextResponse } from "next/server";
import { ENGINE_VERSION } from "@/lib/astrology/types";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("astrology_members")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("astrology_chart_cache")
    .select("payload, engine_version, updated_at")
    .eq("member_id", params.id)
    .eq("engine_version", ENGINE_VERSION)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "No cached chart" }, { status: 404 });
  }

  return NextResponse.json({
    chart: data.payload,
    engineVersion: data.engine_version,
    updatedAt: data.updated_at,
  });
}
