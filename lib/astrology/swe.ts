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
  rise_trans,
  close,
} = sweph;

export type EphemerisMode = "swiss" | "moshier";
export type SiderealMode = "lahiri" | "krishnamurti";

/**
 * Why we are running the ephemeris mode we're running.
 *
 *   files present + calc ok        ──▶ swiss / "files-present"
 *   files absent                   ──▶ moshier / "files-absent"      (warn once)
 *   fs threw while checking        ──▶ moshier / "detect-error"      (warn once)
 *   swiss loaded but calc_ut fails ──▶ per-call moshier retry        (warn each)
 *     └─ 3 consecutive failures    ──▶ moshier / "runtime-downgrade" (warn loudly)
 *
 * This used to be invisible. `detectedMode` latched to "moshier" on the FIRST
 * calc_ut failure, for the remaining life of the process, with no log, no metric
 * and no reset — so one transient failure silently degraded every later chart.
 * Meanwhile /api/astrology/health reported `sweph: true` either way, so the
 * ephemeris precision the product differentiates on was unverifiable from
 * outside. Moshier is a decent analytical fallback but it produces DIFFERENT
 * numbers, and under the integration plan those numbers select scripture.
 *
 * Removing the latch outright would mean a genuinely broken Swiss install
 * retries and fails on every single call forever, doubling the work. So:
 * transient failures no longer stick, persistent ones still do — after 3 in a
 * row, and loudly.
 */
export type EphemerisReason =
  | "files-present"
  | "files-absent"
  | "detect-error"
  | "runtime-downgrade";

export type EphemerisStatus = {
  mode: EphemerisMode;
  reason: EphemerisReason;
  ephePath: string;
  filesPresent: boolean;
  /** Total per-call Swiss failures since process start. */
  runtimeDowngrades: number;
  /** Consecutive failures; resets on any Swiss success. */
  consecutiveFailures: number;
  lastDowngradeAt: string | null;
};

const STICKY_AFTER_CONSECUTIVE_FAILURES = 3;

let initialized = false;
let detectedMode: EphemerisMode = "moshier";
let detectReason: EphemerisReason = "files-absent";
let ephePathUsed = "";
let filesPresent = false;
let runtimeDowngrades = 0;
let consecutiveFailures = 0;
let lastDowngradeAt: string | null = null;
let currentSidereal: SiderealMode = "lahiri";

const REQUIRED_EPHE = ["sepl_18.se1", "semo_18.se1"];

/**
 * Returns whether the .se1 files are usable, and distinguishes "absent" from
 * "the filesystem threw" — previously both collapsed to `false`, so a permissions
 * problem was indistinguishable from files that were never deployed.
 */
function detectSwissFiles(
  ephePath: string
): { present: boolean; reason: "files-present" | "files-absent" | "detect-error" } {
  try {
    const present = REQUIRED_EPHE.every((name) => {
      const p = path.join(ephePath, name);
      return fs.existsSync(p) && fs.statSync(p).size > 10000;
    });
    return { present, reason: present ? "files-present" : "files-absent" };
  } catch (err) {
    console.warn(
      `[sweph] ephemeris detection threw while reading ${ephePath} — ` +
        `falling back to Moshier. This is NOT the same as files being absent: ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
    return { present: false, reason: "detect-error" };
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
  // NOTE: process.cwd() is a runtime string, so Next's output file tracing
  // cannot see it statically. next.config.mjs must declare the ephemeris
  // directory via outputFileTracingIncludes or the .se1 files will not be in
  // the deployed Lambda, and this will silently pick Moshier in production
  // while passing every local check.
  const ephePath = path.join(process.cwd(), "ephemeris");
  ephePathUsed = ephePath;

  const detected = detectSwissFiles(ephePath);
  filesPresent = detected.present;
  detectReason = detected.reason;
  detectedMode = detected.present ? "swiss" : "moshier";

  if (!detected.present && detected.reason === "files-absent") {
    console.warn(
      `[sweph] no usable Swiss Ephemeris files at ${ephePath} — running Moshier. ` +
        `Positions will differ from Swiss. Expected: ${REQUIRED_EPHE.join(", ")}`
    );
  }

  try {
    set_ephe_path(ephePath);
  } catch (err) {
    console.warn(
      `[sweph] set_ephe_path failed for ${ephePath}: ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
  }
  set_sid_mode(sidModeConstant("lahiri"), 0, 0);
  currentSidereal = "lahiri";
  initialized = true;
}

export function getEphemerisMode(): EphemerisMode {
  initSweph();
  return effectiveMode();
}

/**
 * The mode actually in use right now. Differs from `detectedMode` only when
 * Swiss loaded but has failed STICKY_AFTER_CONSECUTIVE_FAILURES times in a row.
 */
function effectiveMode(): EphemerisMode {
  if (
    detectedMode === "swiss" &&
    consecutiveFailures >= STICKY_AFTER_CONSECUTIVE_FAILURES
  ) {
    return "moshier";
  }
  return detectedMode;
}

/** Full status for /api/astrology/health. The whole point is that this is visible. */
export function getEphemerisStatus(): EphemerisStatus {
  initSweph();
  const mode = effectiveMode();
  return {
    mode,
    reason:
      mode === "moshier" && detectedMode === "swiss"
        ? "runtime-downgrade"
        : detectReason,
    ephePath: ephePathUsed,
    filesPresent,
    runtimeDowngrades,
    consecutiveFailures,
    lastDowngradeAt,
  };
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
    effectiveMode() === "swiss"
      ? constants.SEFLG_SWIEPH
      : constants.SEFLG_MOSEPH;
  return eph | constants.SEFLG_SIDEREAL | constants.SEFLG_SPEED;
}

const MOSHIER_FLAGS =
  constants.SEFLG_MOSEPH | constants.SEFLG_SIDEREAL | constants.SEFLG_SPEED;

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
  const usingSwiss = effectiveMode() === "swiss";
  const result = calc_ut(jdUt, PLANET_SWE[planet], getCalcFlags());

  if (result.flag < 0) {
    // Only Swiss can fall back; a Moshier failure is a real failure.
    if (!usingSwiss) {
      throw new Error(result.error || `calc_ut failed for ${planet}`);
    }

    runtimeDowngrades += 1;
    consecutiveFailures += 1;
    lastDowngradeAt = new Date().toISOString();
    console.warn(
      `[sweph] Swiss calc_ut failed for ${planet} (consecutive: ` +
        `${consecutiveFailures}) — retrying this call with Moshier. ` +
        `${result.error || "no error string"}`
    );
    if (consecutiveFailures === STICKY_AFTER_CONSECUTIVE_FAILURES) {
      console.warn(
        `[sweph] ${STICKY_AFTER_CONSECUTIVE_FAILURES} consecutive Swiss ` +
          `failures — switching this process to Moshier until a Swiss call ` +
          `succeeds again. Check that ${ephePathUsed} is present and readable ` +
          `in the deployed environment.`
      );
    }

    const retry = calc_ut(jdUt, PLANET_SWE[planet], MOSHIER_FLAGS);
    if (retry.flag < 0) {
      throw new Error(retry.error || `calc_ut failed for ${planet}`);
    }
    return {
      longitude: ((retry.data[0] % 360) + 360) % 360,
      speed: retry.data[3] ?? 0,
    };
  }

  // A Swiss success clears the streak, so one transient failure no longer
  // poisons every later chart for the life of the process.
  if (usingSwiss && consecutiveFailures > 0) {
    console.warn(
      `[sweph] Swiss recovered after ${consecutiveFailures} consecutive ` +
        `failure(s) — resuming Swiss.`
    );
    consecutiveFailures = 0;
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

/**
 * Next sunrise/sunset (jd UT) at or after jdUt for a location. Uses the Hindu
 * rising convention (disc center, no refraction) — the instant classical
 * panchang elements are read at. Same Swiss→Moshier retry discipline as
 * calcPlanetLongitude: only Swiss may fall back, a Moshier failure is real.
 */
export function calcSunTransit(
  jdUt: number,
  kind: "rise" | "set",
  lat: number,
  lng: number
): number {
  initSweph();
  const rsmi =
    (kind === "rise" ? constants.SE_CALC_RISE : constants.SE_CALC_SET) |
    constants.SE_BIT_HINDU_RISING;
  const geopos: [number, number, number] = [lng, lat, 0];
  const usingSwiss = effectiveMode() === "swiss";
  const eph = usingSwiss ? constants.SEFLG_SWIEPH : constants.SEFLG_MOSEPH;

  const result = rise_trans(jdUt, constants.SE_SUN, null, eph, rsmi, geopos, 0, 0);
  if (result.flag < 0) {
    if (!usingSwiss) {
      throw new Error(result.error || `rise_trans failed (${kind})`);
    }
    const retry = rise_trans(
      jdUt,
      constants.SE_SUN,
      null,
      constants.SEFLG_MOSEPH,
      rsmi,
      geopos,
      0,
      0
    );
    if (retry.flag < 0) {
      throw new Error(retry.error || `rise_trans failed (${kind})`);
    }
    return retry.data;
  }
  return result.data;
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
