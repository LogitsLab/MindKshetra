import {
  longitudeToNakshatra,
  longitudeToSign,
  wholeSignHouse,
} from "@/lib/astrology/signs";
import type { PlanetPosition, SignId } from "@/lib/astrology/types";

type LonMap = (lon: number) => {
  longitude: number;
  sign: SignId;
  signIndex: number;
  degreeInSign: number;
};

function norm(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

function mappedLon(
  signIndex: number,
  remainder: number,
  scale: number
): ReturnType<LonMap> {
  const dLon = signIndex * 30 + remainder * scale;
  const meta = longitudeToSign(norm(dLon));
  return {
    longitude: meta.signIndex * 30 + meta.degreeInSign,
    sign: meta.sign,
    signIndex: meta.signIndex,
    degreeInSign: meta.degreeInSign,
  };
}

/** Navamsa span = 3°20' = 10/3 degrees. */
const NAVAMSA_SPAN = 30 / 9;

/**
 * Classical navamsa: each sign divided into 9 parts of 3°20'.
 */
export function longitudeToNavamsa(longitude: number): ReturnType<LonMap> {
  const lon = norm(longitude);
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const pada = Math.min(8, Math.floor(within / NAVAMSA_SPAN));
  const startSign = signIndex % 2 === 0 ? signIndex : (signIndex + 8) % 12;
  const d9SignIndex = (startSign + pada) % 12;
  return mappedLon(d9SignIndex, within % NAVAMSA_SPAN, 9);
}

/**
 * Dashamsa (D10): each sign → 10 parts of 3°.
 * Odd signs start from same sign; even from the 9th.
 */
export function longitudeToDashamsa(longitude: number): ReturnType<LonMap> {
  const lon = norm(longitude);
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const part = Math.min(9, Math.floor(within / 3));
  const startSign = signIndex % 2 === 0 ? signIndex : (signIndex + 8) % 12;
  const d10SignIndex = (startSign + part) % 12;
  return mappedLon(d10SignIndex, within % 3, 10);
}

/**
 * Drekkana (D3): 10° parts. 1st = same sign, 2nd = 5th, 3rd = 9th (Parasara).
 */
export function longitudeToDrekkana(longitude: number): ReturnType<LonMap> {
  const lon = norm(longitude);
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const part = Math.min(2, Math.floor(within / 10));
  const d3SignIndex = (signIndex + part * 4) % 12;
  return mappedLon(d3SignIndex, within % 10, 3);
}

/**
 * Saptamsa (D7): 7 parts of 30/7°. Odd signs from the same sign; even from the 7th.
 */
export function longitudeToSaptamsa(longitude: number): ReturnType<LonMap> {
  const lon = norm(longitude);
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const span = 30 / 7;
  const part = Math.min(6, Math.floor(within / span));
  const startSign =
    signIndex % 2 === 0 ? signIndex : (signIndex + 6) % 12;
  const d7SignIndex = (startSign + part) % 12;
  return mappedLon(d7SignIndex, within % span, 7);
}

/**
 * Dwadasamsa (D12): 12 parts of 2.5°, counted from the occupied sign.
 */
export function longitudeToDwadasamsa(longitude: number): ReturnType<LonMap> {
  const lon = norm(longitude);
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const span = 2.5;
  const part = Math.min(11, Math.floor(within / span));
  const d12SignIndex = (signIndex + part) % 12;
  return mappedLon(d12SignIndex, within % span, 12);
}

function buildDivisional(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null,
  mapLon: LonMap
): {
  ascendant: PlanetPosition | null;
  planets: PlanetPosition[];
} {
  let dAsc: PlanetPosition | null = null;
  let ascSignIndex: number | null = null;

  if (ascendant) {
    const n = mapLon(ascendant.longitude);
    ascSignIndex = n.signIndex;
    const nak = longitudeToNakshatra(n.longitude);
    dAsc = {
      id: "ascendant",
      longitude: n.longitude,
      sign: n.sign,
      signIndex: n.signIndex,
      degreeInSign: n.degreeInSign,
      nakshatra: nak.nakshatra,
      nakshatraIndex: nak.nakshatraIndex,
      pada: nak.pada,
      nakshatraLord: nak.lord,
      house: 1,
    };
  }

  const dPlanets: PlanetPosition[] = planets.map((p) => {
    const n = mapLon(p.longitude);
    const nak = longitudeToNakshatra(n.longitude);
    return {
      id: p.id,
      longitude: n.longitude,
      sign: n.sign,
      signIndex: n.signIndex,
      degreeInSign: n.degreeInSign,
      nakshatra: nak.nakshatra,
      nakshatraIndex: nak.nakshatraIndex,
      pada: nak.pada,
      nakshatraLord: nak.lord,
      house:
        ascSignIndex != null
          ? wholeSignHouse(n.signIndex, ascSignIndex)
          : undefined,
      retrograde: p.retrograde,
    };
  });

  return { ascendant: dAsc, planets: dPlanets };
}

export function buildNavamsaChart(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null
) {
  return buildDivisional(planets, ascendant, longitudeToNavamsa);
}

export function buildDashamsaChart(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null
) {
  return buildDivisional(planets, ascendant, longitudeToDashamsa);
}

export function buildDrekkanaChart(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null
) {
  return buildDivisional(planets, ascendant, longitudeToDrekkana);
}

export function buildSaptamsaChart(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null
) {
  return buildDivisional(planets, ascendant, longitudeToSaptamsa);
}

export function buildDwadasamsaChart(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null
) {
  return buildDivisional(planets, ascendant, longitudeToDwadasamsa);
}

export function navamsaSummary(d9: {
  ascendant: PlanetPosition | null;
  planets: PlanetPosition[];
}): {
  ascSign: SignId | null;
  moonSign: SignId | null;
  venusHouse: number | null;
} {
  const moon = d9.planets.find((p) => p.id === "moon");
  const venus = d9.planets.find((p) => p.id === "venus");
  return {
    ascSign: d9.ascendant?.sign ?? null,
    moonSign: moon?.sign ?? null,
    venusHouse: venus?.house ?? null,
  };
}
