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
  const startIdx = VIMSHOTTARI_ORDER.indexOf(starLord);
  let remaining = withinNak;
  let subLord: PlanetId = starLord;
  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const arc = table.find((t) => t.lord === lord)!.arc;
    if (remaining < arc) {
      subLord = lord;
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
 * Placidus house occupancy: planet belongs to house H if lon lies in
 * [cusp H, cusp H+1) going zodiacally (wrap-aware).
 */
export function placidusHouseOf(
  longitude: number,
  cusps: number[]
): number {
  const lon = ((longitude % 360) + 360) % 360;
  for (let h = 0; h < 12; h++) {
    const a = cusps[h];
    const b = cusps[(h + 1) % 12];
    if (a <= b) {
      if (lon >= a && lon < b) return h + 1;
    } else {
      // wrap across 0°
      if (lon >= a || lon < b) return h + 1;
    }
  }
  return 1;
}

/**
 * KP significators: cusp star/sub + planets occupying the house via Placidus
 * (not whole-sign) and their star lords.
 */
export type HouseSignificators = {
  house: number;
  significators: PlanetId[];
};

export function houseSignificators(
  kpCusps: KpCusp[],
  kpPlanets: KpPlanet[],
  cuspLongitudes: number[]
): HouseSignificators[] {
  return kpCusps.map((cusp) => {
    const set = new Set<PlanetId>();
    set.add(cusp.starLord);
    set.add(cusp.subLord);
    for (const p of kpPlanets) {
      if (p.id === "ascendant") continue;
      const house =
        p.house ?? placidusHouseOf(p.longitude, cuspLongitudes);
      if (house === cusp.house) {
        set.add(p.id);
        set.add(p.starLord);
      }
    }
    return { house: cusp.house, significators: Array.from(set) };
  });
}

export function cuspMeta(longitude: number): Omit<HouseCusp, "house"> {
  const { sign, signIndex } = longitudeToSign(longitude);
  return { longitude, sign, signIndex };
}
