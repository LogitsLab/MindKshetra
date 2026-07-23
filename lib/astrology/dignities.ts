import type { PlanetId, SignId } from "@/lib/astrology/types";

export type DignityKind =
  | "exalted"
  | "debilitated"
  | "own"
  | "mooltrikona"
  | "neutral";

export type DignityInfo = {
  planet: PlanetId;
  kind: DignityKind;
  label: { en: string; hi: string };
};

const EXALTATION: Partial<Record<PlanetId, SignId>> = {
  sun: "aries",
  moon: "taurus",
  mars: "capricorn",
  mercury: "virgo",
  jupiter: "cancer",
  venus: "pisces",
  saturn: "libra",
};

const DEBILITATION: Partial<Record<PlanetId, SignId>> = {
  sun: "libra",
  moon: "scorpio",
  mars: "cancer",
  mercury: "pisces",
  jupiter: "capricorn",
  venus: "virgo",
  saturn: "aries",
};

const OWN_SIGNS: Partial<Record<PlanetId, SignId[]>> = {
  sun: ["leo"],
  moon: ["cancer"],
  mars: ["aries", "scorpio"],
  mercury: ["gemini", "virgo"],
  jupiter: ["sagittarius", "pisces"],
  venus: ["taurus", "libra"],
  saturn: ["capricorn", "aquarius"],
};

/** Classical moolatrikona signs (simplified; degree ranges ignored). */
const MOOLTRIKONA: Partial<Record<PlanetId, SignId>> = {
  sun: "leo",
  moon: "taurus",
  mars: "aries",
  mercury: "virgo",
  jupiter: "sagittarius",
  venus: "libra",
  saturn: "aquarius",
};

const LABELS: Record<DignityKind, { en: string; hi: string }> = {
  exalted: { en: "Exalted", hi: "उच्च" },
  debilitated: { en: "Debilitated", hi: "नीच" },
  own: { en: "Own sign", hi: "स्वराशि" },
  mooltrikona: { en: "Mooltrikona", hi: "मूलत्रिकोण" },
  neutral: { en: "—", hi: "—" },
};

export function planetDignity(
  planet: PlanetId,
  sign: SignId
): DignityInfo {
  if (EXALTATION[planet] === sign) {
    return { planet, kind: "exalted", label: LABELS.exalted };
  }
  if (DEBILITATION[planet] === sign) {
    return { planet, kind: "debilitated", label: LABELS.debilitated };
  }
  if (MOOLTRIKONA[planet] === sign) {
    return { planet, kind: "mooltrikona", label: LABELS.mooltrikona };
  }
  if (OWN_SIGNS[planet]?.includes(sign)) {
    return { planet, kind: "own", label: LABELS.own };
  }
  return { planet, kind: "neutral", label: LABELS.neutral };
}
