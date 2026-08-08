import { DateTime } from "luxon";
import {
  computeDailyPanchang,
  type DailyPanchang,
} from "@/lib/astrology/daily-panchang";
import { SIGNS } from "@/lib/astrology/signs";
import festivalsData from "@/data/festivals.json";

/**
 * Month calendar of computed observance days (plan Phase 3):
 * ekadashis (both pakshas), purnima, amavasya, sankrantis (sidereal sun
 * ingress), and a short curated named-festival rule table from
 * `data/festivals.json` keyed by lunar month + paksha + tithi.
 *
 * Lunar months use amanta tracking: the month advances the day after
 * amavasya, named from the sunrise sun longitude with Meena→Chaitra
 * mapping. Regional purnimanta labels differ for Krishna-paksha festivals
 * (see notes on Janmashtami in the data file). Never hardcode Gregorian
 * festival dates.
 */
export type ObservanceKind =
  | "ekadashi"
  | "purnima"
  | "amavasya"
  | "sankranti"
  | "festival";

export type Observance = {
  date: string;
  kind: ObservanceKind;
  /** e.g. "Shukla Ekadashi", "Makara Sankranti", "Gita Jayanti" */
  label: string;
  festivalId?: string;
  practiceHint?: FestivalPracticeHint;
  verseRef?: string;
};

export type MonthPanchang = {
  month: string;
  ianaTz: string;
  days: Array<
    Pick<
      DailyPanchang,
      | "date"
      | "tithi"
      | "tithiIndex"
      | "nakshatra"
      | "vaar"
      | "isEkadashi"
      | "isPurnima"
      | "isAmavasya"
    >
  >;
  observances: Observance[];
};

export type LunarMonthId =
  | "chaitra"
  | "vaishakha"
  | "jyeshtha"
  | "ashadha"
  | "shravana"
  | "bhadrapada"
  | "ashvina"
  | "kartika"
  | "margashirsha"
  | "pausha"
  | "magha"
  | "phalguna";

export type Paksha = "shukla" | "krishna";
export type FestivalPracticeHint = "japa" | "verse";

export type FestivalRule = {
  id: string;
  labelEn: string;
  labelHi: string;
  lunarMonth: LunarMonthId;
  paksha: Paksha;
  /** 1–15 within the paksha (15 = Purnima / Amavasya). */
  tithi: number;
  practiceHint?: FestivalPracticeHint;
  verseRef?: string;
  notes?: string;
};

export type FestivalMatch = {
  id: string;
  labelEn: string;
  labelHi: string;
  practiceHint?: FestivalPracticeHint;
  verseRef?: string;
};

const LUNAR_MONTHS: LunarMonthId[] = [
  "chaitra",
  "vaishakha",
  "jyeshtha",
  "ashadha",
  "shravana",
  "bhadrapada",
  "ashvina",
  "kartika",
  "margashirsha",
  "pausha",
  "magha",
  "phalguna",
];

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

function normLon(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function signOf(longitude: number): string {
  return SIGNS[Math.floor(normLon(longitude) / 30)];
}

/**
 * Amanta month that begins the day after an amavasya, from that amavasya's
 * (or the next sunrise's) sidereal sun longitude. Meena→Chaitra, Mesha→
 * Vaishakha, … Kumbha→Phalguna.
 */
export function amantaMonthAfterAmavasya(amaSunLongitude: number): LunarMonthId {
  const sunSign = Math.floor(normLon(amaSunLongitude) / 30);
  return LUNAR_MONTHS[(sunSign + 1) % 12];
}

export function pakshaOf(tithiIndex: number): Paksha {
  return tithiIndex < 15 ? "shukla" : "krishna";
}

/** 1–15 within the current paksha. */
export function tithiNumberOf(tithiIndex: number): number {
  return (tithiIndex % 15) + 1;
}

export function loadFestivalRules(): FestivalRule[] {
  const raw = (festivalsData as { festivals?: FestivalRule[] }).festivals;
  return Array.isArray(raw) ? raw : [];
}

export function matchFestivalRules(
  lunarMonth: LunarMonthId,
  paksha: Paksha,
  tithiNumber: number,
  rules: FestivalRule[] = loadFestivalRules()
): FestivalMatch[] {
  return rules
    .filter(
      (r) =>
        r.lunarMonth === lunarMonth &&
        r.paksha === paksha &&
        r.tithi === tithiNumber
    )
    .map((r) => ({
      id: r.id,
      labelEn: r.labelEn,
      labelHi: r.labelHi,
      practiceHint: r.practiceHint,
      verseRef: r.verseRef,
    }));
}

/**
 * Resolve the amanta lunar month for a civil date at the location's sunrise
 * panchang. Walks back to the preceding amavasya (cached callers should
 * prefer tracking across a month loop).
 */
export function resolveAmantaMonth(
  dateISO: string,
  lat: number,
  lng: number,
  ianaTz: string
): LunarMonthId {
  const dt = DateTime.fromISO(dateISO, { zone: ianaTz });
  if (!dt.isValid) {
    throw new Error(`Invalid date: ${dateISO}`);
  }
  for (let i = 0; i < 35; i++) {
    const d = dt.minus({ days: i }).toISODate()!;
    const p = computeDailyPanchang(d, lat, lng, ianaTz);
    if (!p.isAmavasya) continue;
    const newMonth = amantaMonthAfterAmavasya(p.sunLongitude);
    if (i === 0) {
      // Amavasya ends the prior month; name that ending month.
      const idx = LUNAR_MONTHS.indexOf(newMonth);
      return LUNAR_MONTHS[(idx + 11) % 12];
    }
    return newMonth;
  }
  // Rare: no sunrise amavasya in window (kshaya). Fall back to sun mapping.
  const p = computeDailyPanchang(dateISO, lat, lng, ianaTz);
  const sunSign = Math.floor(normLon(p.sunLongitude) / 30);
  return p.tithiIndex >= 15
    ? LUNAR_MONTHS[sunSign]
    : LUNAR_MONTHS[(sunSign + 1) % 12];
}

/** Named festivals matching today's lunar month + paksha + tithi. */
export function festivalsForDailyPanchang(
  p: DailyPanchang,
  lat: number,
  lng: number
): FestivalMatch[] {
  const lunarMonth = resolveAmantaMonth(p.date, lat, lng, p.ianaTz);
  return matchFestivalRules(
    lunarMonth,
    pakshaOf(p.tithiIndex),
    tithiNumberOf(p.tithiIndex)
  );
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
  const rules = loadFestivalRules();

  // Seed the ingress detector from the PREVIOUS month's final sunrise. With a
  // null seed, an ingress falling between that sunrise and the 1st's sunrise
  // was invisible to both months: the prior month's loop ended before it, and
  // this month's first iteration only recorded the sign without comparing.
  const seedDate = start.minus({ days: 1 }).toISODate()!;
  let prevSunSign: string = signOf(
    computeDailyPanchang(seedDate, lat, lng, ianaTz).sunLongitude
  );

  const firstDate = start.toISODate()!;
  let lunarMonth = resolveAmantaMonth(firstDate, lat, lng, ianaTz);
  let monthAfterAmavasya: LunarMonthId | null = null;

  for (let d = 0; d < start.daysInMonth!; d++) {
    const date = start.plus({ days: d }).toISODate()!;
    const p = computeDailyPanchang(date, lat, lng, ianaTz);

    if (monthAfterAmavasya) {
      lunarMonth = monthAfterAmavasya;
      monthAfterAmavasya = null;
    }

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
      monthAfterAmavasya = amantaMonthAfterAmavasya(p.sunLongitude);
    }

    for (const fest of matchFestivalRules(
      lunarMonth,
      pakshaOf(p.tithiIndex),
      tithiNumberOf(p.tithiIndex),
      rules
    )) {
      observances.push({
        date: p.date,
        kind: "festival",
        label: fest.labelEn,
        festivalId: fest.id,
        practiceHint: fest.practiceHint,
        verseRef: fest.verseRef,
      });
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
