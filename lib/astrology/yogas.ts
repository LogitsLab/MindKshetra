import type {
  PlanetId,
  PlanetPosition,
  SignId,
  YogaFlag,
} from "@/lib/astrology/types";
import { SIGNS } from "@/lib/astrology/signs";

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);

const SIGN_LORDS: Record<SignId, PlanetId> = {
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

function find(planets: PlanetPosition[], id: PlanetId) {
  return planets.find((p) => p.id === id);
}

function houseOf(planets: PlanetPosition[], id: PlanetId): number | null {
  return find(planets, id)?.house ?? null;
}

function kendraApart(h1: number, h2: number): boolean {
  const d = ((h1 - h2 + 12) % 12) + 1;
  return d === 1 || d === 4 || d === 7 || d === 10;
}

export function detectMangalDosha(planets: PlanetPosition[]): YogaFlag {
  const mars = find(planets, "mars");
  const h = mars?.house;
  const afflicted = h != null && [1, 2, 4, 7, 8, 12].includes(h);
  return {
    id: "mangal_dosha",
    name: "Mangal Dosha",
    present: Boolean(afflicted),
    severity: afflicted ? "caution" : "info",
    detail: afflicted
      ? `Mars occupies house ${h} from the Ascendant — traditionally counted as Mangal Dosha.`
      : "Mars is not in the classic Mangal Dosha houses from the Ascendant.",
    housesInvolved: afflicted && h != null ? [h] : [],
  };
}

export function detectKaalSarp(planets: PlanetPosition[]): YogaFlag {
  const rahu = find(planets, "rahu");
  const ketu = find(planets, "ketu");
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
      housesInvolved: [],
    };
  }

  const inArc = (lon: number, a: number, b: number) => {
    const x = (lon - a + 360) % 360;
    const span = (b - a + 360) % 360;
    return x >= 0 && x <= span;
  };

  const allInRahuToKetu = others.every((p) =>
    inArc(p.longitude, rahu.longitude, ketu.longitude)
  );
  const allInKetuToRahu = others.every((p) =>
    inArc(p.longitude, ketu.longitude, rahu.longitude)
  );
  const present = allInRahuToKetu || allInKetuToRahu;

  return {
    id: "kaal_sarp",
    name: "Kaal Sarp Dosha",
    present,
    severity: present ? "caution" : "info",
    detail: present
      ? "All planets lie between Rahu and Ketu — a simplified Kaal Sarp pattern."
      : "Planets are not all confined between the nodes.",
    housesInvolved: present
      ? [rahu.house, ketu.house].filter((x): x is number => x != null)
      : [],
  };
}

export function detectRajYoga(
  planets: PlanetPosition[],
  ascSignIndex: number
): YogaFlag {
  const houseSign = (house: number): SignId =>
    SIGNS[(ascSignIndex + house - 1) % 12];

  const kendraLords = [1, 4, 7, 10].map((h) => SIGN_LORDS[houseSign(h)]);
  const trikonaLords = [1, 5, 9].map((h) => SIGN_LORDS[houseSign(h)]);

  let present = false;
  let detail = "No classic kendra–trikona lord conjunction detected.";
  const housesInvolved: number[] = [];

  for (const p of planets) {
    if (!p.house) continue;
    const isKendraLord = kendraLords.includes(p.id);
    const isTrikonaLord = trikonaLords.includes(p.id);
    if (isKendraLord && TRIKONA.has(p.house)) {
      present = true;
      detail = `${p.id} (kendra lord) sits in trikona house ${p.house}.`;
      housesInvolved.push(p.house);
      break;
    }
    if (isTrikonaLord && KENDRA.has(p.house)) {
      present = true;
      detail = `${p.id} (trikona lord) sits in kendra house ${p.house}.`;
      housesInvolved.push(p.house);
      break;
    }
  }

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
            if (a.house) housesInvolved.push(a.house);
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
    housesInvolved,
  };
}

/** Moon and Jupiter in mutual kendras. */
export function detectGajakesari(planets: PlanetPosition[]): YogaFlag {
  const moonH = houseOf(planets, "moon");
  const jupH = houseOf(planets, "jupiter");
  const present =
    moonH != null && jupH != null && kendraApart(moonH, jupH);
  return {
    id: "gajakesari",
    name: "Gajakesari Yoga",
    present,
    severity: present ? "positive" : "info",
    detail: present
      ? `Moon (H${moonH}) and Jupiter (H${jupH}) occupy mutual kendras.`
      : "Moon and Jupiter are not in mutual kendra from each other.",
    housesInvolved: present ? [moonH!, jupH!] : [],
  };
}

/** Sun and Mercury in the same sign. */
export function detectBudhaditya(planets: PlanetPosition[]): YogaFlag {
  const sun = find(planets, "sun");
  const merc = find(planets, "mercury");
  const present =
    sun != null && merc != null && sun.signIndex === merc.signIndex;
  return {
    id: "budhaditya",
    name: "Budhaditya Yoga",
    present,
    severity: present ? "positive" : "info",
    detail: present
      ? `Sun and Mercury conjoin in ${sun!.sign}.`
      : "Sun and Mercury are not conjoined.",
    housesInvolved: present && sun?.house != null ? [sun.house] : [],
  };
}

/** Moon and Mars in the same sign. */
export function detectChandraMangal(planets: PlanetPosition[]): YogaFlag {
  const moon = find(planets, "moon");
  const mars = find(planets, "mars");
  const present =
    moon != null && mars != null && moon.signIndex === mars.signIndex;
  return {
    id: "chandra_mangal",
    name: "Chandra-Mangal Yoga",
    present,
    severity: present ? "positive" : "info",
    detail: present
      ? `Moon and Mars conjoin in ${moon!.sign}.`
      : "Moon and Mars are not conjoined.",
    housesInvolved: present && moon?.house != null ? [moon.house] : [],
  };
}

/**
 * Kemadruma (simplified): Moon has no planet in 2nd or 12th from itself
 * (excluding Sun), and is not in a kendra from Asc — cautious flag.
 */
export function detectKemadruma(
  planets: PlanetPosition[],
  ascSignIndex: number | null
): YogaFlag {
  const moon = find(planets, "moon");
  if (!moon?.house) {
    return {
      id: "kemadruma",
      name: "Kemadruma Yoga",
      present: false,
      severity: "info",
      detail: "Moon house unknown — Kemadruma not evaluated.",
      housesInvolved: [],
    };
  }
  const h2 = (moon.house % 12) + 1;
  const h12 = ((moon.house - 2 + 12) % 12) + 1;
  const neighbors = planets.filter(
    (p) =>
      p.id !== "moon" &&
      p.id !== "sun" &&
      p.id !== "ascendant" &&
      (p.house === h2 || p.house === h12)
  );
  const moonInKendra = KENDRA.has(moon.house);
  const present = neighbors.length === 0 && !moonInKendra && ascSignIndex != null;
  return {
    id: "kemadruma",
    name: "Kemadruma Yoga",
    present,
    severity: present ? "caution" : "info",
    detail: present
      ? "Moon lacks flanking planets (2nd/12th) and is not in a kendra — simplified Kemadruma flag."
      : "Kemadruma pattern not indicated under simplified rules.",
    housesInvolved: present ? [moon.house] : [],
  };
}

/** Sun in 9th with weak/afflicted 9th — Pitra-style caution (Sun in 9). */
export function detectPitraFlag(planets: PlanetPosition[]): YogaFlag {
  const sun = find(planets, "sun");
  const present = sun?.house === 9;
  return {
    id: "pitra_flag",
    name: "Pitra Dosha (simplified)",
    present,
    severity: present ? "caution" : "info",
    detail: present
      ? "Sun occupies the 9th — a simplified Pitra-related caution used for reflection, not a full classical diagnosis."
      : "Sun is not in the 9th house under this simplified Pitra check.",
    housesInvolved: present ? [9] : [],
  };
}

/** Pancha Mahapurusha subset: planet in own/exalt in kendra (Mars→Ruchaka, etc.). */
export function detectPanchaMahapurusha(planets: PlanetPosition[]): YogaFlag[] {
  const rules: {
    id: string;
    name: string;
    planet: PlanetId;
    signs: SignId[];
  }[] = [
    {
      id: "ruchaka",
      name: "Ruchaka Yoga",
      planet: "mars",
      signs: ["aries", "scorpio", "capricorn"],
    },
    {
      id: "bhadra",
      name: "Bhadra Yoga",
      planet: "mercury",
      signs: ["gemini", "virgo"],
    },
    {
      id: "hamsa",
      name: "Hamsa Yoga",
      planet: "jupiter",
      signs: ["sagittarius", "pisces", "cancer"],
    },
    {
      id: "malavya",
      name: "Malavya Yoga",
      planet: "venus",
      signs: ["taurus", "libra", "pisces"],
    },
    {
      id: "sasa",
      name: "Sasa Yoga",
      planet: "saturn",
      signs: ["capricorn", "aquarius", "libra"],
    },
  ];

  return rules.map((r) => {
    const p = find(planets, r.planet);
    const present =
      p?.house != null &&
      KENDRA.has(p.house) &&
      r.signs.includes(p.sign);
    return {
      id: r.id,
      name: r.name,
      present: Boolean(present),
      severity: present ? ("positive" as const) : ("info" as const),
      detail: present
        ? `${r.planet} in ${p!.sign} in kendra house ${p!.house} — ${r.name}.`
        : `${r.planet} does not form ${r.name} (own/exalt in kendra).`,
      housesInvolved: present && p?.house != null ? [p.house] : [],
    };
  });
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
      housesInvolved: [],
    });
    flags.push({
      id: "raj_yoga",
      name: "Raj Yoga",
      present: false,
      severity: "info",
      detail: "Birth time unknown — house-based yogas are disabled.",
      housesInvolved: [],
    });
  } else {
    flags.push(detectMangalDosha(planets));
    flags.push(detectRajYoga(planets, ascSignIndex));
    flags.push(detectGajakesari(planets));
    flags.push(detectKemadruma(planets, ascSignIndex));
    flags.push(detectPitraFlag(planets));
    flags.push(...detectPanchaMahapurusha(planets));
  }

  flags.push(detectKaalSarp(planets));
  flags.push(detectBudhaditya(planets));
  flags.push(detectChandraMangal(planets));
  return flags;
}
