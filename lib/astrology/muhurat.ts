/**
 * Muhurat / Choghadiya helpers — approximate Vedic day segments.
 * Feature-flagged lifestyle layer; ephemeris sunrise/sunset when available,
 * otherwise civil approx. Not a substitute for a classical muhurat office.
 */

export type ChoghadiyaKind = "Udveg" | "Chal" | "Labh" | "Amrit" | "Kaal" | "Shubh" | "Rog";

export type ChoghadiyaSlot = {
  kind: ChoghadiyaKind;
  startIso: string;
  endIso: string;
  quality: "good" | "neutral" | "avoid";
};

export type MuhuratWindow = {
  id: string;
  nameEn: string;
  nameHi: string;
  startIso: string;
  endIso: string;
  tag: "Best" | "Good" | "Caution";
};

/** Day Choghadiya sequence starting from Sunday (vaar 0). */
const DAY_SEQ: ChoghadiyaKind[][] = [
  ["Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"], // Sun
  ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit"], // Mon
  ["Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog"], // Tue
  ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh"], // Wed
  ["Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh"], // Thu
  ["Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal"], // Fri
  ["Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal"], // Sat
];

function quality(kind: ChoghadiyaKind): ChoghadiyaSlot["quality"] {
  if (kind === "Amrit" || kind === "Shubh" || kind === "Labh") return "good";
  if (kind === "Chal") return "neutral";
  return "avoid";
}

/**
 * Split [sunrise, sunset] into 8 equal Choghadiya slots for the weekday.
 * `weekday`: 0=Sunday … 6=Saturday (JS getDay()).
 */
export function computeDayChoghadiya(
  sunrise: Date,
  sunset: Date,
  weekday: number
): ChoghadiyaSlot[] {
  const seq = DAY_SEQ[((weekday % 7) + 7) % 7];
  const span = Math.max(1, sunset.getTime() - sunrise.getTime());
  const slice = span / 8;
  return seq.map((kind, i) => {
    const start = new Date(sunrise.getTime() + slice * i);
    const end = new Date(sunrise.getTime() + slice * (i + 1));
    return {
      kind,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      quality: quality(kind),
    };
  });
}

/** Abhijit muhurat ≈ midday eighth of the day (classical approx). */
export function computeAbhijitMuhurat(
  sunrise: Date,
  sunset: Date
): MuhuratWindow {
  const span = sunset.getTime() - sunrise.getTime();
  const mid = sunrise.getTime() + span / 2;
  const half = span / 30; // ~24 min on a 12h day
  return {
    id: "abhijit",
    nameEn: "Abhijit Muhurat",
    nameHi: "अभिजित मुहूर्त",
    startIso: new Date(mid - half).toISOString(),
    endIso: new Date(mid + half).toISOString(),
    tag: "Best",
  };
}

export function defaultCivilSun(date: Date, tzOffsetMinutes = 330): {
  sunrise: Date;
  sunset: Date;
} {
  // Crude IST-friendly civil approx for UI when ephemeris sunrise unavailable.
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const sunrise = new Date(Date.UTC(y, m, d, 0, 0, 0));
  sunrise.setUTCMinutes(sunrise.getUTCMinutes() + (5 * 60 + 30) - tzOffsetMinutes + 5 * 60 + 31);
  // Simpler: fixed 05:45 / 18:45 local for placeholder
  const rise = new Date(date);
  rise.setHours(5, 45, 0, 0);
  const set = new Date(date);
  set.setHours(18, 45, 0, 0);
  return { sunrise: rise, sunset: set };
}
