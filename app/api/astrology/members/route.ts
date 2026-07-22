import { NextRequest, NextResponse } from "next/server";
import { mapMemberRow } from "@/lib/astrology/members";
import { resolveBirthInstant } from "@/lib/astrology/geo";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("astrology_members")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[astrology/members] list", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    members: (data || []).map(mapMemberRow),
  });
}

export async function POST(request: NextRequest) {
  const userId = await getSignedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rl = await rateLimit(`astro:members:${userId}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const relationship = String(body.relationship || "self");
  const dob = String(body.dob || "");
  const tobUnknown = Boolean(body.tobUnknown);
  const tob = tobUnknown
    ? null
    : body.tob
      ? String(body.tob)
      : null;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const placeLabel = String(body.placeLabel || "").trim();
  const gender = body.gender ? String(body.gender) : null;

  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !placeLabel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  let resolved;
  try {
    resolved = resolveBirthInstant({
      dob,
      tob,
      tobUnknown,
      lat,
      lng,
      placeLabel,
      ianaTz: body.ianaTz ? String(body.ianaTz) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid birth data";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("astrology_members")
    .insert({
      user_id: userId,
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
    })
    .select("*")
    .single();

  if (error) {
    console.warn("[astrology/members] create", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: mapMemberRow(data) }, { status: 201 });
}
