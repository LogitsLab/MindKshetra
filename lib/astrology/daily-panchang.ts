import { DateTime } from "luxon";
import {
  calcPlanetLongitude,
  calcSunTransit,
  utcPartsToJd,
} from "@/lib/astrology/swe";
import {
  computeBirthPanchang,
  type BirthPanchang,
} from "@/lib/astrology/panchang";

/**
 * The day's panchang for a place (plan Phase 1). Convention, stated honestly
 * in the UI: elements are read at local sunrise (Hindu rising: disc center,
 * no refraction), Lahiri ayanamsa. Regional almanacs that use other rules
 * (udaya vs midnight attribution) can differ near element boundaries.
 *
 * End times come from stepping+bisection over the existing longitude calls —
 * the ephemeris stays the only source of truth, no approximation tables.
 */
export type DailyPanchang = BirthPanchang & {
  date: string;
  ianaTz: string;
  /** ISO timestamps in the location's zone; null only on engine failure. */
  sunrise: string | null;
  sunset: string | null;
  tithiEndsAt: string | null;
  nakshatraEndsAt: string | null;
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
};

const DAY_MS = 86_400_000;
const JD_UNIX_EPOCH = 2_440_587.5;

function jdToDate(jdUt: number): Date {
  return new Date(Math.round((jdUt - JD_UNIX_EPOCH) * DAY_MS));
}

function dateToJd(date: Date): number {
  const { jdUt } = utcPartsToJd(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  return jdUt;
}

function norm(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

function elongationAt(jdUt: number): number {
  const sun = calcPlanetLongitude(jdUt, "sun").longitude;
  const moon = calcPlanetLongitude(jdUt, "moon").longitude;
  return norm(moon - sun);
}

function moonLongitudeAt(jdUt: number): number {
  return calcPlanetLongitude(jdUt, "moon").longitude;
}

/**
 * First jd after `fromJd` where `indexOf(value)` leaves `startIndex`.
 * Steps hourly (both cycles move ~0.5°/hour against ~6–13° bins), then
 * bisects to ~30 seconds. Returns null when no change within `horizonDays`.
 */
function findBoundary(
  fromJd: number,
  startIndex: number,
  indexAt: (jd: number) => number,
  horizonDays = 2
): number | null {
  const stepJd = 1 / 24;
  let prev = fromJd;
  for (let i = 1; i <= horizonDays * 24; i++) {
    const next = fromJd + i * stepJd;
    if (indexAt(next) !== startIndex) {
      let lo = prev;
      let hi = next;
      for (let iter = 0; iter < 18; iter++) {
        const mid = (lo + hi) / 2;
        if (indexAt(mid) === startIndex) lo = mid;
        else hi = mid;
      }
      return hi;
    }
    prev = next;
  }
  return null;
}

function isoInZone(jdUt: number, ianaTz: string): string | null {
  const iso = DateTime.fromJSDate(jdToDate(jdUt), { zone: "utc" })
    .setZone(ianaTz)
    .toISO({ suppressMilliseconds: true });
  return iso ?? null;
}

export function computeDailyPanchang(
  dateISO: string,
  lat: number,
  lng: number,
  ianaTz: string
): DailyPanchang {
  const localMidnight = DateTime.fromISO(dateISO, { zone: ianaTz }).startOf(
    "day"
  );
  if (!localMidnight.isValid) {
    throw new Error(`Invalid date: ${dateISO}`);
  }
  const midnightJd = dateToJd(localMidnight.toUTC().toJSDate());

  const sunriseJd = calcSunTransit(midnightJd, "rise", lat, lng);
  const sunsetJd = calcSunTransit(sunriseJd, "set", lat, lng);

  const sunAtRise = calcPlanetLongitude(sunriseJd, "sun").longitude;
  const moonAtRise = calcPlanetLongitude(sunriseJd, "moon").longitude;
  const sunriseIsoUtc = jdToDate(sunriseJd).toISOString();

  const base = computeBirthPanchang(sunAtRise, moonAtRise, sunriseIsoUtc, ianaTz);

  const tithiEndJd = findBoundary(sunriseJd, base.tithiIndex, (jd) =>
    Math.floor(elongationAt(jd) / 12)
  );
  const nakshatraEndJd = findBoundary(
    sunriseJd,
    Math.min(26, Math.floor(norm(moonAtRise) / (360 / 27))),
    (jd) => Math.min(26, Math.floor(norm(moonLongitudeAt(jd)) / (360 / 27)))
  );

  return {
    ...base,
    date: localMidnight.toISODate()!,
    ianaTz,
    sunrise: isoInZone(sunriseJd, ianaTz),
    sunset: isoInZone(sunsetJd, ianaTz),
    tithiEndsAt: tithiEndJd ? isoInZone(tithiEndJd, ianaTz) : null,
    nakshatraEndsAt: nakshatraEndJd ? isoInZone(nakshatraEndJd, ianaTz) : null,
    isEkadashi: base.tithiIndex % 15 === 10,
    isPurnima: base.tithiIndex === 14,
    isAmavasya: base.tithiIndex === 29,
  };
}
