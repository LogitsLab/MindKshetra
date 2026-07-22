import type { PlanetId, SignId } from "@/lib/astrology/types";

export const SIGNS: SignId[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

export const SIGN_LABELS: Record<SignId, { en: string; hi: string }> = {
  aries: { en: "Aries", hi: "मेष" },
  taurus: { en: "Taurus", hi: "वृषभ" },
  gemini: { en: "Gemini", hi: "मिथुन" },
  cancer: { en: "Cancer", hi: "कर्क" },
  leo: { en: "Leo", hi: "सिंह" },
  virgo: { en: "Virgo", hi: "कन्या" },
  libra: { en: "Libra", hi: "तुला" },
  scorpio: { en: "Scorpio", hi: "वृश्चिक" },
  sagittarius: { en: "Sagittarius", hi: "धनु" },
  capricorn: { en: "Capricorn", hi: "मकर" },
  aquarius: { en: "Aquarius", hi: "कुम्भ" },
  pisces: { en: "Pisces", hi: "मीन" },
};

export const PLANET_LABELS: Record<PlanetId, { en: string; hi: string }> = {
  sun: { en: "Sun", hi: "सूर्य" },
  moon: { en: "Moon", hi: "चन्द्र" },
  mars: { en: "Mars", hi: "मंगल" },
  mercury: { en: "Mercury", hi: "बुध" },
  jupiter: { en: "Jupiter", hi: "गुरु" },
  venus: { en: "Venus", hi: "शुक्र" },
  saturn: { en: "Saturn", hi: "शनि" },
  rahu: { en: "Rahu", hi: "राहु" },
  ketu: { en: "Ketu", hi: "केतु" },
  ascendant: { en: "Ascendant", hi: "लग्न" },
};

/** Vimshottari order starting from Ketu (as used for nakshatra lords). */
export const VIMSHOTTARI_ORDER: PlanetId[] = [
  "ketu",
  "venus",
  "sun",
  "moon",
  "mars",
  "rahu",
  "jupiter",
  "saturn",
  "mercury",
];

/** Mahadasha lengths in years (Vimshottari 120-year cycle). */
export const DASHA_YEARS: Record<
  Exclude<PlanetId, "ascendant">,
  number
> = {
  ketu: 7,
  venus: 20,
  sun: 6,
  moon: 10,
  mars: 7,
  rahu: 18,
  jupiter: 16,
  saturn: 19,
  mercury: 17,
};

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export function longitudeToSign(lon: number): {
  sign: SignId;
  signIndex: number;
  degreeInSign: number;
} {
  const normalized = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  return {
    sign: SIGNS[signIndex],
    signIndex,
    degreeInSign: normalized - signIndex * 30,
  };
}

export function longitudeToNakshatra(lon: number): {
  nakshatra: string;
  nakshatraIndex: number;
  pada: number;
  lord: PlanetId;
} {
  const normalized = ((lon % 360) + 360) % 360;
  const span = 360 / 27;
  const nakshatraIndex = Math.min(26, Math.floor(normalized / span));
  const within = normalized - nakshatraIndex * span;
  const pada = Math.min(4, Math.floor(within / (span / 4)) + 1);
  const lord = VIMSHOTTARI_ORDER[nakshatraIndex % 9];
  return {
    nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraIndex,
    pada,
    lord,
  };
}

export function wholeSignHouse(
  planetSignIndex: number,
  ascSignIndex: number
): number {
  return ((planetSignIndex - ascSignIndex + 12) % 12) + 1;
}
