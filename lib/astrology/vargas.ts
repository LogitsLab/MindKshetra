import {
  longitudeToNakshatra,
  longitudeToSign,
  wholeSignHouse,
} from "@/lib/astrology/signs";
import type { PlanetPosition, SignId } from "@/lib/astrology/types";

/** Navamsa span = 3°20' = 10/3 degrees. */
const NAVAMSA_SPAN = 30 / 9;

/**
 * Classical navamsa: each sign divided into 9 parts of 3°20'.
 */
export function longitudeToNavamsa(longitude: number): {
  longitude: number;
  sign: SignId;
  signIndex: number;
  degreeInSign: number;
} {
  const lon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const pada = Math.min(8, Math.floor(within / NAVAMSA_SPAN));
  const startSign = signIndex % 2 === 0 ? signIndex : (signIndex + 8) % 12;
  const d9SignIndex = (startSign + pada) % 12;
  const d9Lon = d9SignIndex * 30 + (within % NAVAMSA_SPAN) * 9;
  const meta = longitudeToSign(d9Lon);
  return {
    longitude: ((d9Lon % 360) + 360) % 360,
    sign: meta.sign,
    signIndex: meta.signIndex,
    degreeInSign: meta.degreeInSign,
  };
}

/**
 * Dashamsa (D10): each sign → 10 parts of 3°.
 * Odd signs start from same sign; even from the 9th.
 */
export function longitudeToDashamsa(longitude: number): {
  longitude: number;
  sign: SignId;
  signIndex: number;
  degreeInSign: number;
} {
  const lon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const part = Math.min(9, Math.floor(within / 3));
  const startSign = signIndex % 2 === 0 ? signIndex : (signIndex + 8) % 12;
  const d10SignIndex = (startSign + part) % 12;
  const d10Lon = d10SignIndex * 30 + (within % 3) * 10;
  const meta = longitudeToSign(d10Lon);
  return {
    longitude: ((d10Lon % 360) + 360) % 360,
    sign: meta.sign,
    signIndex: meta.signIndex,
    degreeInSign: meta.degreeInSign,
  };
}

function buildDivisional(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null,
  mapLon: (lon: number) => {
    longitude: number;
    sign: SignId;
    signIndex: number;
    degreeInSign: number;
  }
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
