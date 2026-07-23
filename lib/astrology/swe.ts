import fs from "fs";
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

export type EphemerisMode = "swiss" | "moshier";
export type SiderealMode = "lahiri" | "krishnamurti";

let initialized = false;
let detectedMode: EphemerisMode = "moshier";
let currentSidereal: SiderealMode = "lahiri";

const REQUIRED_EPHE = ["sepl_18.se1", "semo_18.se1"];

function detectSwissFiles(ephePath: string): boolean {
  try {
    return REQUIRED_EPHE.every((name) => {
      const p = path.join(ephePath, name);
      return fs.existsSync(p) && fs.statSync(p).size > 10000;
    });
  } catch {
    return false;
  }
}

function sidModeConstant(mode: SiderealMode): number {
  return mode === "krishnamurti"
    ? constants.SE_SIDM_KRISHNAMURTI
    : constants.SE_SIDM_LAHIRI;
}

/**
 * Prefer Swiss Ephemeris files when present under ./ephemeris;
 * otherwise fall back to built-in Moshier.
 */
export function initSweph(): void {
  if (initialized) return;
  const ephePath = path.join(process.cwd(), "ephemeris");
  detectedMode = detectSwissFiles(ephePath) ? "swiss" : "moshier";
  try {
    set_ephe_path(ephePath);
  } catch {
    /* path optional */
  }
  set_sid_mode(sidModeConstant("lahiri"), 0, 0);
  currentSidereal = "lahiri";
  initialized = true;
}

export function getEphemerisMode(): EphemerisMode {
  initSweph();
  return detectedMode;
}

export function setSiderealMode(mode: SiderealMode): void {
  initSweph();
  if (currentSidereal === mode) return;
  set_sid_mode(sidModeConstant(mode), 0, 0);
  currentSidereal = mode;
}

export function getCalcFlags(): number {
  initSweph();
  const eph =
    detectedMode === "swiss"
      ? constants.SEFLG_SWIEPH
      : constants.SEFLG_MOSEPH;
  return eph | constants.SEFLG_SIDEREAL | constants.SEFLG_SPEED;
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
  planet: Exclude<PlanetId, "ascendant" | "ketu">,
  sidereal: SiderealMode = "lahiri"
): { longitude: number; speed: number } {
  setSiderealMode(sidereal);
  const flags = getCalcFlags();
  const result = calc_ut(jdUt, PLANET_SWE[planet], flags);
  if (result.flag < 0) {
    // Fallback once if Swiss files fail at runtime
    if (detectedMode === "swiss") {
      detectedMode = "moshier";
      const retry = calc_ut(
        jdUt,
        PLANET_SWE[planet],
        constants.SEFLG_MOSEPH | constants.SEFLG_SIDEREAL | constants.SEFLG_SPEED
      );
      if (retry.flag < 0) {
        throw new Error(retry.error || `calc_ut failed for ${planet}`);
      }
      return {
        longitude: ((retry.data[0] % 360) + 360) % 360,
        speed: retry.data[3] ?? 0,
      };
    }
    throw new Error(result.error || `calc_ut failed for ${planet}`);
  }
  return {
    longitude: ((result.data[0] % 360) + 360) % 360,
    speed: result.data[3] ?? 0,
  };
}

export function calcTrueNode(
  jdUt: number,
  sidereal: SiderealMode = "lahiri"
): {
  rahu: number;
  ketu: number;
  rahuSpeed: number;
} {
  const { longitude, speed } = calcPlanetLongitude(jdUt, "rahu", sidereal);
  return {
    rahu: longitude,
    ketu: (longitude + 180) % 360,
    rahuSpeed: speed,
  };
}

export function calcAyanamsa(
  jdUt: number,
  sidereal: SiderealMode = "lahiri"
): number {
  setSiderealMode(sidereal);
  return get_ayanamsa_ut(jdUt);
}

/** Placidus house cusps (sidereal), returns cusps 1–12. */
export function calcPlacidusCusps(
  jdUt: number,
  lat: number,
  lng: number,
  sidereal: SiderealMode = "lahiri"
): { cusps: number[]; ascmc: number[] } {
  setSiderealMode(sidereal);
  const result = houses_ex(jdUt, constants.SEFLG_SIDEREAL, lat, lng, "P");
  if (result.flag !== constants.OK) {
    throw new Error("houses_ex (Placidus) failed");
  }
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
  currentSidereal = "lahiri";
}

export { constants as sweConstants };
