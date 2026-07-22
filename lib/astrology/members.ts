import type { AstrologyMember, BirthInput, Relationship, Gender } from "@/lib/astrology/types";

export function mapMemberRow(row: {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  dob: string;
  tob: string | null;
  tob_unknown: boolean;
  gender: string | null;
  place_label: string;
  lat: number;
  lng: number;
  iana_tz: string;
  utc_offset_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): AstrologyMember {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    relationship: row.relationship as Relationship,
    dob: row.dob,
    tob: row.tob ? String(row.tob).slice(0, 8) : null,
    tobUnknown: row.tob_unknown,
    gender: (row.gender as Gender | null) ?? null,
    placeLabel: row.place_label,
    lat: row.lat,
    lng: row.lng,
    ianaTz: row.iana_tz,
    utcOffsetMinutes: row.utc_offset_minutes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function memberToBirthInput(m: AstrologyMember): BirthInput {
  return {
    name: m.name,
    dob: m.dob,
    tob: m.tob,
    tobUnknown: m.tobUnknown,
    placeLabel: m.placeLabel,
    lat: m.lat,
    lng: m.lng,
    ianaTz: m.ianaTz,
    utcOffsetMinutes: m.utcOffsetMinutes,
    gender: m.gender,
  };
}

export function parseBirthBody(body: unknown): BirthInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const dob = String(b.dob || "");
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const placeLabel = String(b.placeLabel || b.place_label || "");
  const ianaTz = String(b.ianaTz || b.iana_tz || "");
  const tobUnknown = Boolean(b.tobUnknown ?? b.tob_unknown);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !placeLabel || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const tobRaw = b.tob == null || b.tob === "" ? null : String(b.tob);
  return {
    name: b.name != null ? String(b.name) : undefined,
    dob,
    tob: tobUnknown ? null : tobRaw,
    tobUnknown,
    placeLabel,
    lat,
    lng,
    ianaTz: ianaTz || "UTC",
    utcOffsetMinutes: Number(b.utcOffsetMinutes ?? b.utc_offset_minutes ?? 0),
    gender: (b.gender as Gender | null | undefined) ?? null,
  };
}
