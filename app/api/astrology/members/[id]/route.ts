import { NextRequest, NextResponse } from "next/server";
import { mapMemberRow } from "@/lib/astrology/members";
import { resolveBirthInstant } from "@/lib/astrology/geo";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing, error: findErr } = await supabase
    .from("astrology_members")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (findErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const name = body.name != null ? String(body.name).trim() : existing.name;
  const relationship =
    body.relationship != null
      ? String(body.relationship)
      : existing.relationship;
  const dob = body.dob != null ? String(body.dob) : existing.dob;
  const tobUnknown =
    body.tobUnknown != null ? Boolean(body.tobUnknown) : existing.tob_unknown;
  const tob = tobUnknown
    ? null
    : body.tob != null
      ? String(body.tob)
      : existing.tob;
  const lat = body.lat != null ? Number(body.lat) : existing.lat;
  const lng = body.lng != null ? Number(body.lng) : existing.lng;
  const placeLabel =
    body.placeLabel != null
      ? String(body.placeLabel).trim()
      : existing.place_label;
  const gender =
    body.gender !== undefined
      ? body.gender
        ? String(body.gender)
        : null
      : existing.gender;

  let resolved;
  try {
    resolved = resolveBirthInstant({
      dob,
      tob,
      tobUnknown,
      lat,
      lng,
      placeLabel,
      ianaTz: body.ianaTz ? String(body.ianaTz) : existing.iana_tz,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid birth data";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("astrology_members")
    .update({
      name,
      relationship,
      dob,
      tob,
      tob_unknown: tobUnknown,
      gender,
      place_label: placeLabel,
      lat,
      lng,
      iana_tz: resolved.ianaTz,
      utc_offset_minutes: resolved.utcOffsetMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate chart cache on birth edit
  await supabase.from("astrology_chart_cache").delete().eq("member_id", params.id);

  return NextResponse.json({
    member: mapMemberRow(data),
    warning: "Birth data updated — previous chart cache cleared.",
  });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("astrology_members")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
