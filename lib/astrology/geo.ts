import { find as findTz } from "geo-tz";
import { DateTime } from "luxon";
import type { GeocodeResult } from "@/lib/astrology/types";

const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT?.trim() ||
  "MindKshetra/1.0 (astrology; contact: hello@logitslab.com)";

export type ResolveBirthResult = {
  placeLabel: string;
  lat: number;
  lng: number;
  ianaTz: string;
  utcOffsetMinutes: number;
  utcIso: string;
  localIso: string;
};

/**
 * Geocode a place query via OpenStreetMap Nominatim.
 * Respect usage policy: identify the app, cache results upstream.
 */
export async function geocodePlace(
  query: string,
  limit = 5
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.min(10, Math.max(1, limit))));
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": NOMINATIM_UA,
      Accept: "application/json",
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`);
  }

  const rows = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return rows.map((row) => {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    const zones = findTz(lat, lng);
    return {
      label: row.display_name,
      lat,
      lng,
      ianaTz: zones[0] || "UTC",
    };
  });
}

export function resolveIanaTz(lat: number, lng: number): string {
  const zones = findTz(lat, lng);
  return zones[0] || "UTC";
}

/**
 * Convert local civil birth date/time in an IANA zone to UTC,
 * using historical tz rules (not "today's offset").
 */
export function resolveBirthInstant(input: {
  dob: string;
  tob: string | null;
  tobUnknown: boolean;
  lat: number;
  lng: number;
  placeLabel: string;
  ianaTz?: string;
}): ResolveBirthResult {
  const ianaTz = input.ianaTz || resolveIanaTz(input.lat, input.lng);
  const [y, m, d] = input.dob.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error("Invalid date of birth");
  }

  let hour = 12;
  let minute = 0;
  let second = 0;
  if (!input.tobUnknown && input.tob) {
    const parts = input.tob.split(":").map(Number);
    hour = parts[0] ?? 12;
    minute = parts[1] ?? 0;
    second = parts[2] ?? 0;
  }

  const local = DateTime.fromObject(
    { year: y, month: m, day: d, hour, minute, second },
    { zone: ianaTz }
  );

  if (!local.isValid) {
    throw new Error(local.invalidReason || "Invalid local birth time");
  }

  const utc = local.toUTC();
  return {
    placeLabel: input.placeLabel,
    lat: input.lat,
    lng: input.lng,
    ianaTz,
    utcOffsetMinutes: local.offset,
    utcIso: utc.toISO()!,
    localIso: local.toISO()!,
  };
}

export function parseUtcIso(iso: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const dt = DateTime.fromISO(iso, { zone: "utc" });
  if (!dt.isValid) throw new Error("Invalid UTC ISO");
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: dt.hour,
    minute: dt.minute,
    second: dt.second + dt.millisecond / 1000,
  };
}
