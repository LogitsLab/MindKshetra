import { NextRequest, NextResponse } from "next/server";
import { HANDLE_SHAPE } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public profile lookup — RLS only returns rows the viewer may see. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { handle: string } }
) {
  const handle = params.handle?.toLowerCase();
  if (!handle || !HANDLE_SHAPE.test(handle)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("handle, display_name, bio, avatar_key, created_at")
    .eq("handle", handle)
    .eq("is_public", true)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { profile: data },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
