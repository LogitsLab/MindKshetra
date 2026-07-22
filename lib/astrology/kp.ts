import {
  DASHA_YEARS,
  VIMSHOTTARI_ORDER,
  longitudeToNakshatra,
  longitudeToSign,
} from "@/lib/astrology/signs";
import type {
  HouseCusp,
  KpCusp,
  KpPlanet,
  PlanetId,
  PlanetPosition,
} from "@/lib/astrology/types";

/**
 * KP uses the same Vimshottari proportions to subdivide each nakshatra (13°20')
 * into 9 sub-lord zones (the 249-division table).
 * Total years = 120 → each planet's arc = (years/120) * (360/27).
 */

const NAK_SPAN = 360 / 27;

function subLordTable(): { lord: PlanetId; arc: number }[] {
  return VIMSHOTTARI_ORDER.map((lord) => ({
    lord,
    arc:
      (DASHA_YEARS[lord as Exclude<PlanetId, "ascendant">] / 120) * NAK_SPAN,
  }));
}

export function longitudeToSubLords(lon: number): {
  starLord: PlanetId;
  subLord: PlanetId;
  subSubLord: PlanetId;
} {
  const normalized = ((lon % 360) + 360) % 360;
  const { lord: starLord, nakshatraIndex } = longitudeToNakshatra(normalized);
  const nakStart = nakshatraIndex * NAK_SPAN;
  const withinNak = normalized - nakStart;

  const table = subLordTable();
  // Sub-lord: start from star lord in Vimshottari order
  const startIdx = VIMSHOTTARI_ORDER.indexOf(starLord);
  let remaining = withinNak;
  let subLord: PlanetId = starLord;
  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const arc = table.find((t) => t.lord === lord)!.arc;
    if (remaining < arc) {
      subLord = lord;
      // Sub-sub within this sub arc, starting from subLord
      let rem2 = remaining;
      const subStartIdx = VIMSHOTTARI_ORDER.indexOf(subLord);
      for (let j = 0; j < 9; j++) {
        const lord2 = VIMSHOTTARI_ORDER[(subStartIdx + j) % 9];
        const arc2 =
          (DASHA_YEARS[lord2 as Exclude<PlanetId, "ascendant">] / 120) * arc;
        if (rem2 < arc2) {
          return { starLord, subLord, subSubLord: lord2 };
        }
        rem2 -= arc2;
      }
      return { starLord, subLord, subSubLord: subLord };
    }
    remaining -= arc;
  }
  return { starLord, subLord, subSubLord: subLord };
}

export function enrichKpCusps(cusps: HouseCusp[]): KpCusp[] {
  return cusps.map((c) => ({
    ...c,
    ...longitudeToSubLords(c.longitude),
  }));
}

export function enrichKpPlanets(planets: PlanetPosition[]): KpPlanet[] {
  return planets.map((p) => ({
    ...p,
    ...longitudeToSubLords(p.longitude),
  }));
}

/**
 * Simplified KP significators for a house: cusp star/sub lords + planets
 * occupying the house (whole-sign) and their star lords.
 */
export type HouseSignificators = {
  house: number;
  significators: PlanetId[];
};

export function houseSignificators(
  kpCusps: KpCusp[],
  planets: PlanetPosition[],
  ascSignIndex: number
): HouseSignificators[] {
  return kpCusps.map((cusp) => {
    const set = new Set<PlanetId>();
    set.add(cusp.starLord);
    set.add(cusp.subLord);
    for (const p of planets) {
      if (p.id === "ascendant") continue;
      const house =
        p.house ??
        ((p.signIndex - ascSignIndex + 12) % 12) + 1;
      if (house === cusp.house) {
        set.add(p.id);
        const sub = longitudeToSubLords(p.longitude);
        set.add(sub.starLord);
      }
    }
    return { house: cusp.house, significators: Array.from(set) };
  });
}

export function cuspMeta(longitude: number): Omit<HouseCusp, "house"> {
  const { sign, signIndex } = longitudeToSign(longitude);
  return { longitude, sign, signIndex };
}
