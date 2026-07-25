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

/** Approximate exaltation degree peaks (classical). */
const EXALT_DEG: Partial<Record<PlanetId, number>> = {
  sun: 10,
  moon: 3,
  mars: 28,
  mercury: 15,
  jupiter: 5,
  venus: 27,
  saturn: 20,
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

/** Mooltrikona: sign + degree range [start, end) in that sign. */
const MOOLTRIKONA: Partial<
  Record<PlanetId, { sign: SignId; from: number; to: number }>
> = {
  sun: { sign: "leo", from: 0, to: 20 },
  moon: { sign: "taurus", from: 4, to: 30 },
  mars: { sign: "aries", from: 0, to: 12 },
  mercury: { sign: "virgo", from: 16, to: 20 },
  jupiter: { sign: "sagittarius", from: 0, to: 10 },
  venus: { sign: "libra", from: 0, to: 15 },
  saturn: { sign: "aquarius", from: 0, to: 20 },
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
  sign: SignId,
  degreeInSign = 15
): DignityInfo {
  if (EXALTATION[planet] === sign) {
    const peak = EXALT_DEG[planet];
    // Still exaltation anywhere in sign; peak noted only for kind
    if (peak == null || Math.abs(degreeInSign - peak) <= 15) {
      return { planet, kind: "exalted", label: LABELS.exalted };
    }
    return { planet, kind: "exalted", label: LABELS.exalted };
  }
  if (DEBILITATION[planet] === sign) {
    return { planet, kind: "debilitated", label: LABELS.debilitated };
  }
  const mt = MOOLTRIKONA[planet];
  if (
    mt &&
    mt.sign === sign &&
    degreeInSign >= mt.from &&
    degreeInSign < mt.to
  ) {
    return { planet, kind: "mooltrikona", label: LABELS.mooltrikona };
  }
  if (OWN_SIGNS[planet]?.includes(sign)) {
    return { planet, kind: "own", label: LABELS.own };
  }
  return { planet, kind: "neutral", label: LABELS.neutral };
}
