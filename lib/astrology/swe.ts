import path from "path";
import sweph from "sweph";
import type { PlanetId } from "@/lib/astrology/types";

const {
  constants,
  set_ephe_path,
  set_sid_mode,
  utc_to_jd,
  calc_ut,
  get_ayanamsa_ut,
  houses_ex,
  close,
} = sweph;

let initialized = false;

/**
 * Prefer Swiss Ephemeris files when present under ./ephemeris;
 * otherwise fall back to built-in Moshier (fine for serverless).
 */
export function initSweph(): void {
  if (initialized) return;
  const ephePath = path.join(process.cwd(), "ephemeris");
  try {
    set_ephe_path(ephePath);
  } catch {
    /* path optional */
  }
  set_sid_mode(constants.SE_SIDM_LAHIRI, 0, 0);
  initialized = true;
}

export function getCalcFlags(): number {
  // Moshier avoids shipping large .se1 files on Vercel; accuracy is sufficient
  // for natal chart work. Switch to SEFLG_SWIEPH when ephemeris/ is populated.
  return constants.SEFLG_MOSEPH | constants.SEFLG_SIDEREAL | constants.SEFLG_SPEED;
}

const PLANET_SWE: Record<Exclude<PlanetId, "ascendant" | "ketu">, number> = {
  sun: constants.SE_SUN,
  moon: constants.SE_MOON,
  mercury: constants.SE_MERCURY,
  venus: constants.SE_VENUS,
  mars: constants.SE_MARS,
  jupiter: constants.SE_JUPITER,
  saturn: constants.SE_SATURN,
  rahu: constants.SE_TRUE_NODE, // true Node — KP-friendly
};

export function utcPartsToJd(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): { jdEt: number; jdUt: number } {
  initSweph();
  const result = utc_to_jd(
    year,
    month,
    day,
    hour,
    minute,
    second,
    constants.SE_GREG_CAL
  );
  if (result.flag !== constants.OK) {
    throw new Error(result.error || "utc_to_jd failed");
  }
  const [jdEt, jdUt] = result.data;
  return { jdEt, jdUt };
}

export function calcPlanetLongitude(
  jdUt: number,
  planet: Exclude<PlanetId, "ascendant" | "ketu">
): { longitude: number; speed: number } {
  initSweph();
  const flags = getCalcFlags();
  const result = calc_ut(jdUt, PLANET_SWE[planet], flags);
  if (result.flag < 0) {
    throw new Error(result.error || `calc_ut failed for ${planet}`);
  }
  return {
    longitude: ((result.data[0] % 360) + 360) % 360,
    speed: result.data[3] ?? 0,
  };
}

export function calcTrueNode(jdUt: number): {
  rahu: number;
  ketu: number;
  rahuSpeed: number;
} {
  const { longitude, speed } = calcPlanetLongitude(jdUt, "rahu");
  return {
    rahu: longitude,
    ketu: (longitude + 180) % 360,
    rahuSpeed: speed,
  };
}

export function calcAyanamsa(jdUt: number): number {
  initSweph();
  return get_ayanamsa_ut(jdUt);
}

/** Placidus house cusps (sidereal), returns cusps 1–12. */
export function calcPlacidusCusps(
  jdUt: number,
  lat: number,
  lng: number
): { cusps: number[]; ascmc: number[] } {
  initSweph();
  const result = houses_ex(jdUt, constants.SEFLG_SIDEREAL, lat, lng, "P");
  if (result.flag !== constants.OK) {
    throw new Error("houses_ex (Placidus) failed");
  }
  // sweph returns houses[0]=cusp1 … houses[11]=cusp12
  const cusps = result.data.houses.map((v: number) => ((v % 360) + 360) % 360);
  const ascmc = result.data.points.map((v: number) => ((v % 360) + 360) % 360);
  return { cusps, ascmc };
}

export function closeSweph(): void {
  try {
    close();
  } catch {
    /* ignore */
  }
  initialized = false;
}

export { constants as sweConstants };
