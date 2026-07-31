import { DateTime } from "luxon";
import {
  computeDailyPanchang,
  type DailyPanchang,
} from "@/lib/astrology/daily-panchang";
import { SIGNS } from "@/lib/astrology/signs";

/**
 * Month calendar of computed observance days (plan Phase 3, honest v1):
 * ekadashis (both pakshas), purnima, amavasya, and sankrantis (sidereal sun
 * ingress — Makara Sankranti et al.). Every date comes off the ephemeris.
 *
 * A curated named-festival rule table (Janmashtami, Gita Jayanti…) is
 * deliberately DEFERRED: lunar-month naming has regional conventions
 * (amanta/purnimanta, udaya rules) and a wrong festival date is worse than
 * an absent one. When it lands it must be a reviewable data file mapping
 * (lunar month, paksha, tithi) — computed, never hardcoded Gregorian dates.
 */
export type ObservanceKind = "ekadashi" | "purnima" | "amavasya" | "sankranti";

export type Observance = {
  date: string;
  kind: ObservanceKind;
  /** e.g. "Shukla Ekadashi", "Makara Sankranti" */
  label: string;
};

export type MonthPanchang = {
  month: string;
  ianaTz: string;
  days: Array<
    Pick<
      DailyPanchang,
      "date" | "tithi" | "tithiIndex" | "nakshatra" | "vaar" | "isEkadashi" | "isPurnima" | "isAmavasya"
    >
  >;
  observances: Observance[];
};

/** Sanskrit sign names for sankranti labels (SIGNS ids are latin zodiac). */
const SANKRANTI_NAME: Record<string, string> = {
  aries: "Mesha",
  taurus: "Vrishabha",
  gemini: "Mithuna",
  cancer: "Karka",
  leo: "Simha",
  virgo: "Kanya",
  libra: "Tula",
  scorpio: "Vrischika",
  sagittarius: "Dhanu",
  capricorn: "Makara",
  aquarius: "Kumbha",
  pisces: "Meena",
};

function signOf(longitude: number): string {
  return SIGNS[Math.floor(((longitude % 360) + 360) % 360 / 30)];
}

export function computeMonthPanchang(
  month: string,
  lat: number,
  lng: number,
  ianaTz: string
): MonthPanchang {
  const start = DateTime.fromISO(`${month}-01`, { zone: ianaTz });
  if (!start.isValid) {
    throw new Error(`Invalid month: ${month}`);
  }

  const days: MonthPanchang["days"] = [];
  const observances: Observance[] = [];

  // Seed the ingress detector from the PREVIOUS month's final sunrise. With a
  // null seed, an ingress falling between that sunrise and the 1st's sunrise
  // was invisible to both months: the prior month's loop ended before it, and
  // this month's first iteration only recorded the sign without comparing.
  const seedDate = start.minus({ days: 1 }).toISODate()!;
  let prevSunSign: string = signOf(
    computeDailyPanchang(seedDate, lat, lng, ianaTz).sunLongitude
  );

  for (let d = 0; d < start.daysInMonth!; d++) {
    const date = start.plus({ days: d }).toISODate()!;
    const p = computeDailyPanchang(date, lat, lng, ianaTz);
    days.push({
      date: p.date,
      tithi: p.tithi,
      tithiIndex: p.tithiIndex,
      nakshatra: p.nakshatra,
      vaar: p.vaar,
      isEkadashi: p.isEkadashi,
      isPurnima: p.isPurnima,
      isAmavasya: p.isAmavasya,
    });

    if (p.isEkadashi) {
      observances.push({ date: p.date, kind: "ekadashi", label: p.tithi });
    }
    if (p.isPurnima) {
      observances.push({ date: p.date, kind: "purnima", label: "Purnima" });
    }
    if (p.isAmavasya) {
      observances.push({ date: p.date, kind: "amavasya", label: "Amavasya" });
    }

    const sunSign = signOf(p.sunLongitude);
    if (sunSign !== prevSunSign) {
      observances.push({
        date: p.date,
        kind: "sankranti",
        label: `${SANKRANTI_NAME[sunSign] ?? sunSign} Sankranti`,
      });
    }
    prevSunSign = sunSign;
  }

  return { month, ianaTz, days, observances };
}
