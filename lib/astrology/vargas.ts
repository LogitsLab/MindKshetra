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
 * Odd signs (Aries, Gemini, …): parts map starting from the same sign.
 * Even signs (Taurus, Cancer, …): parts map starting from the 9th (Libra for Taurus…).
 * Sign indices: 0=Aries (odd), 1=Taurus (even).
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

  // Odd rashi (1-based odd → even 0-based index): start at same sign
  // Even rashi: start 8 signs ahead (Taurus→Libra = +8)
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

export function buildNavamsaChart(
  planets: PlanetPosition[],
  ascendant: PlanetPosition | null
): {
  ascendant: PlanetPosition | null;
  planets: PlanetPosition[];
} {
  let d9Asc: PlanetPosition | null = null;
  let ascSignIndex: number | null = null;

  if (ascendant) {
    const n = longitudeToNavamsa(ascendant.longitude);
    ascSignIndex = n.signIndex;
    const nak = longitudeToNakshatra(n.longitude);
    d9Asc = {
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

  const d9Planets: PlanetPosition[] = planets.map((p) => {
    const n = longitudeToNavamsa(p.longitude);
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

  return { ascendant: d9Asc, planets: d9Planets };
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
