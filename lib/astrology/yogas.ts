import type { PlanetPosition, SignId, YogaFlag } from "@/lib/astrology/types";

function mangalHouses(positions: PlanetPosition[]): number[] {
  const mars = positions.find((p) => p.id === "mars");
  if (!mars?.house) return [];
  return [mars.house];
}

/**
 * Classic Mangal Dosha: Mars in 1, 2, 4, 7, 8, or 12 from Ascendant.
 */
export function detectMangalDosha(planets: PlanetPosition[]): YogaFlag {
  const houses = mangalHouses(planets);
  const afflicted = houses.some((h) => [1, 2, 4, 7, 8, 12].includes(h));
  return {
    id: "mangal_dosha",
    name: "Mangal Dosha",
    present: afflicted,
    severity: afflicted ? "caution" : "info",
    detail: afflicted
      ? `Mars occupies house ${houses[0]} from the Ascendant — traditionally counted as Mangal Dosha.`
      : "Mars is not in the classic Mangal Dosha houses from the Ascendant.",
  };
}

/**
 * Kaal Sarp: all planets hemmed between Rahu and Ketu (simplified check:
 * every classical planet lies on one arc between the nodes).
 */
export function detectKaalSarp(planets: PlanetPosition[]): YogaFlag {
  const rahu = planets.find((p) => p.id === "rahu");
  const ketu = planets.find((p) => p.id === "ketu");
  const others = planets.filter((p) =>
    ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"].includes(
      p.id
    )
  );
  if (!rahu || !ketu || others.length < 7) {
    return {
      id: "kaal_sarp",
      name: "Kaal Sarp Dosha",
      present: false,
      severity: "info",
      detail: "Insufficient planet data to evaluate Kaal Sarp.",
    };
  }

  const r = rahu.longitude;
  const inArc = (lon: number, a: number, b: number) => {
    const x = ((lon - a + 360) % 360);
    const span = ((b - a + 360) % 360);
    return x >= 0 && x <= span;
  };

  const allInRahuToKetu = others.every((p) => inArc(p.longitude, r, ketu.longitude));
  const allInKetuToRahu = others.every((p) => inArc(p.longitude, ketu.longitude, r));
  const present = allInRahuToKetu || allInKetuToRahu;

  return {
    id: "kaal_sarp",
    name: "Kaal Sarp Dosha",
    present,
    severity: present ? "caution" : "info",
    detail: present
      ? "All planets lie between Rahu and Ketu — a simplified Kaal Sarp pattern."
      : "Planets are not all confined between the nodes.",
  };
}

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);

/**
 * Simple Raj Yoga: a kendra lord and a trikona lord conjoined or exchanging,
 * approximated by lords occupying each other's dignified houses.
 */
export function detectRajYoga(
  planets: PlanetPosition[],
  ascSignIndex: number
): YogaFlag {
  const signLords: Record<SignId, string> = {
    aries: "mars",
    taurus: "venus",
    gemini: "mercury",
    cancer: "moon",
    leo: "sun",
    virgo: "mercury",
    libra: "venus",
    scorpio: "mars",
    sagittarius: "jupiter",
    capricorn: "saturn",
    aquarius: "saturn",
    pisces: "jupiter",
  };

  const signs: SignId[] = [
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

  const houseSign = (house: number): SignId =>
    signs[(ascSignIndex + house - 1) % 12];

  const kendraLords = [1, 4, 7, 10].map((h) => signLords[houseSign(h)]);
  const trikonaLords = [1, 5, 9].map((h) => signLords[houseSign(h)]);

  let present = false;
  let detail = "No classic kendra–trikona lord conjunction detected.";

  for (const p of planets) {
    if (!p.house) continue;
    const isKendraLord = kendraLords.includes(p.id);
    const isTrikonaLord = trikonaLords.includes(p.id);
    if (isKendraLord && TRIKONA.has(p.house)) {
      present = true;
      detail = `${p.id} (kendra lord) sits in trikona house ${p.house}.`;
      break;
    }
    if (isTrikonaLord && KENDRA.has(p.house)) {
      present = true;
      detail = `${p.id} (trikona lord) sits in kendra house ${p.house}.`;
      break;
    }
  }

  // Conjunction of kendra + trikona lords
  if (!present) {
    for (const a of planets) {
      for (const b of planets) {
        if (a.id >= b.id) continue;
        if (a.signIndex === b.signIndex) {
          if (
            (kendraLords.includes(a.id) && trikonaLords.includes(b.id)) ||
            (kendraLords.includes(b.id) && trikonaLords.includes(a.id))
          ) {
            present = true;
            detail = `${a.id} and ${b.id} conjoin — kendra and trikona lords together.`;
          }
        }
      }
    }
  }

  return {
    id: "raj_yoga",
    name: "Raj Yoga",
    present,
    severity: present ? "positive" : "info",
    detail,
  };
}

export function detectYogas(
  planets: PlanetPosition[],
  ascSignIndex: number | null
): YogaFlag[] {
  const flags: YogaFlag[] = [];
  if (ascSignIndex == null) {
    flags.push({
      id: "mangal_dosha",
      name: "Mangal Dosha",
      present: false,
      severity: "info",
      detail: "Birth time unknown — house-based yogas are disabled.",
    });
    flags.push({
      id: "raj_yoga",
      name: "Raj Yoga",
      present: false,
      severity: "info",
      detail: "Birth time unknown — house-based yogas are disabled.",
    });
  } else {
    flags.push(detectMangalDosha(planets));
    flags.push(detectRajYoga(planets, ascSignIndex));
  }
  flags.push(detectKaalSarp(planets));
  return flags;
}
