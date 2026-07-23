import { DateTime } from "luxon";
import { buildAllVerdicts } from "@/lib/astrology/blend";
import { buildVimshottariTree, findCurrentDasha } from "@/lib/astrology/dasha";
import { planetDignity } from "@/lib/astrology/dignities";
import { parseUtcIso, resolveBirthInstant } from "@/lib/astrology/geo";
import {
  enrichKpCusps,
  enrichKpPlanets,
  houseSignificators,
  placidusHouseOf,
} from "@/lib/astrology/kp";
import { buildLalKitabReport } from "@/lib/astrology/lalkitab";
import { computeBirthPanchang } from "@/lib/astrology/panchang";
import {
  longitudeToNakshatra,
  longitudeToSign,
  wholeSignHouse,
} from "@/lib/astrology/signs";
import {
  calcAyanamsa,
  calcPlacidusCusps,
  calcPlanetLongitude,
  calcTrueNode,
  getEphemerisMode,
  utcPartsToJd,
} from "@/lib/astrology/swe";
import { computeTransits } from "@/lib/astrology/transits";
import { ENGINE_VERSION } from "@/lib/astrology/types";
import type {
  BirthInput,
  ChartPayload,
  HouseCusp,
  PlanetId,
  PlanetPosition,
} from "@/lib/astrology/types";
import { buildNavamsaChart } from "@/lib/astrology/vargas";
import { detectYogas } from "@/lib/astrology/yogas";

const CLASSICAL: Exclude<PlanetId, "ascendant" | "ketu" | "rahu">[] = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
];

function toPosition(
  id: PlanetId,
  longitude: number,
  speed = 0,
  ascSignIndex: number | null
): PlanetPosition {
  const { sign, signIndex, degreeInSign } = longitudeToSign(longitude);
  const nak = longitudeToNakshatra(longitude);
  return {
    id,
    longitude,
    sign,
    signIndex,
    degreeInSign,
    nakshatra: nak.nakshatra,
    nakshatraIndex: nak.nakshatraIndex,
    pada: nak.pada,
    house:
      ascSignIndex != null
        ? wholeSignHouse(signIndex, ascSignIndex)
        : undefined,
    retrograde: speed < 0,
  };
}

function toKpPosition(
  id: PlanetId,
  longitude: number,
  speed: number,
  cuspLongitudes: number[]
): PlanetPosition {
  const { sign, signIndex, degreeInSign } = longitudeToSign(longitude);
  const nak = longitudeToNakshatra(longitude);
  return {
    id,
    longitude,
    sign,
    signIndex,
    degreeInSign,
    nakshatra: nak.nakshatra,
    nakshatraIndex: nak.nakshatraIndex,
    pada: nak.pada,
    house: placidusHouseOf(longitude, cuspLongitudes),
    retrograde: speed < 0,
  };
}

export function computeChart(birth: BirthInput): ChartPayload {
  const resolved = resolveBirthInstant({
    dob: birth.dob,
    tob: birth.tob,
    tobUnknown: birth.tobUnknown,
    lat: birth.lat,
    lng: birth.lng,
    placeLabel: birth.placeLabel,
    ianaTz: birth.ianaTz,
  });

  const utc = parseUtcIso(resolved.utcIso);
  const { jdUt } = utcPartsToJd(
    utc.year,
    utc.month,
    utc.day,
    utc.hour,
    utc.minute,
    utc.second
  );

  const ephemerisMode = getEphemerisMode();
  const ayanamsa = calcAyanamsa(jdUt, "lahiri");
  const tobUnknown = birth.tobUnknown;

  let placidusCusps: HouseCusp[] | null = null;
  let wholeSignHouses: HouseCusp[] | null = null;
  let ascendant: PlanetPosition | null = null;
  let ascSignIndex: number | null = null;
  let ayanamsaKp: number | null = null;
  let kpCuspLongitudes: number[] | null = null;
  let kpAscLon: number | null = null;

  if (!tobUnknown) {
    // Vedic Asc / whole-sign from Lahiri Placidus Asc degree
    const { ascmc: lahiriAsc } = calcPlacidusCusps(
      jdUt,
      birth.lat,
      birth.lng,
      "lahiri"
    );
    ascSignIndex = longitudeToSign(lahiriAsc[0]).signIndex;
    ascendant = toPosition("ascendant", lahiriAsc[0], 0, ascSignIndex);

    wholeSignHouses = Array.from({ length: 12 }, (_, i) => {
      const signIndex = (ascSignIndex! + i) % 12;
      const longitude = signIndex * 30;
      return {
        house: i + 1,
        longitude,
        sign: longitudeToSign(longitude).sign,
        signIndex,
      };
    });

    // KP path: Krishnamurti ayanamsa + Placidus cusps
    ayanamsaKp = calcAyanamsa(jdUt, "krishnamurti");
    const { cusps: kpCuspsRaw, ascmc: kpAscmc } = calcPlacidusCusps(
      jdUt,
      birth.lat,
      birth.lng,
      "krishnamurti"
    );
    kpCuspLongitudes = kpCuspsRaw;
    kpAscLon = kpAscmc[0];
    placidusCusps = kpCuspsRaw.map((longitude, i) => {
      const meta = longitudeToSign(longitude);
      return {
        house: i + 1,
        longitude,
        sign: meta.sign,
        signIndex: meta.signIndex,
      };
    });
  }

  // Vedic planet positions (Lahiri) — whole-sign houses
  const planets: PlanetPosition[] = [];
  for (const id of CLASSICAL) {
    const { longitude, speed } = calcPlanetLongitude(jdUt, id, "lahiri");
    planets.push(toPosition(id, longitude, speed, ascSignIndex));
  }
  const nodes = calcTrueNode(jdUt, "lahiri");
  planets.push(toPosition("rahu", nodes.rahu, nodes.rahuSpeed, ascSignIndex));
  planets.push(toPosition("ketu", nodes.ketu, -nodes.rahuSpeed, ascSignIndex));

  const moon = planets.find((p) => p.id === "moon")!;
  const sun = planets.find((p) => p.id === "sun")!;

  const { balanceDays, tree } = buildVimshottariTree(
    moon.longitude,
    resolved.utcIso,
    1
  );
  const asOfDate = DateTime.utc().toISODate()!;
  const current = findCurrentDasha(tree, asOfDate);

  const yogas = detectYogas(planets, ascSignIndex);
  const panchang = computeBirthPanchang(
    sun.longitude,
    moon.longitude,
    resolved.utcIso
  );
  const dignities = planets
    .filter((p) => p.id !== "rahu" && p.id !== "ketu")
    .map((p) => planetDignity(p.id, p.sign));

  const d9 = buildNavamsaChart(planets, ascendant);
  const transits = computeTransits(asOfDate, planets);
  const lalKitab = buildLalKitabReport(planets);

  let kp: ChartPayload["kp"] = null;
  let significators = null;
  if (placidusCusps && kpCuspLongitudes && kpAscLon != null) {
    const kpPlanetsRaw: PlanetPosition[] = [];
    for (const id of CLASSICAL) {
      const { longitude, speed } = calcPlanetLongitude(
        jdUt,
        id,
        "krishnamurti"
      );
      kpPlanetsRaw.push(
        toKpPosition(id, longitude, speed, kpCuspLongitudes)
      );
    }
    const kpNodes = calcTrueNode(jdUt, "krishnamurti");
    kpPlanetsRaw.push(
      toKpPosition("rahu", kpNodes.rahu, kpNodes.rahuSpeed, kpCuspLongitudes)
    );
    kpPlanetsRaw.push(
      toKpPosition(
        "ketu",
        kpNodes.ketu,
        -kpNodes.rahuSpeed,
        kpCuspLongitudes
      )
    );

    const kpCusps = enrichKpCusps(placidusCusps);
    const kpPlanets = enrichKpPlanets(kpPlanetsRaw);
    significators = houseSignificators(
      kpCusps,
      kpPlanets,
      kpCuspLongitudes
    );
    kp = { cusps: kpCusps, planets: kpPlanets, significators };
  }

  // Restore Lahiri as default sidereal mode for any later calcs
  calcAyanamsa(jdUt, "lahiri");

  const base: ChartPayload = {
    engineVersion: ENGINE_VERSION,
    computedAt: DateTime.utc().toISO()!,
    asOfDate,
    ephemerisMode,
    birth: {
      ...birth,
      ianaTz: resolved.ianaTz,
      utcOffsetMinutes: resolved.utcOffsetMinutes,
    },
    jdUt,
    ayanamsa,
    ayanamsaKp,
    tobUnknown,
    planets,
    ascendant,
    wholeSignHouses,
    placidusCusps,
    overview: {
      ascendantSign: ascendant?.sign ?? null,
      moonSign: moon.sign,
      sunSign: sun.sign,
      currentMaha: current.maha,
      currentAntar: current.antar,
      currentPratyantar: current.pratyantar,
    },
    dasha: { balanceAtBirthDays: balanceDays, tree },
    yogas,
    kp,
    panchang,
    dignities,
    vargas: { d9 },
    transits,
    lalKitab,
    verdicts: { vedic: [], kp: [], blended: [] },
  };

  base.verdicts = buildAllVerdicts(base, significators);
  return base;
}

/** Fixed JD smoke check for /api/astrology/health */
export function healthSunLongitude(): {
  ok: boolean;
  jdUt: number;
  sunLongitude: number;
  ayanamsa: number;
  engine: string;
  ephemeris: "swiss" | "moshier";
} {
  const { jdUt } = utcPartsToJd(1990, 6, 15, 6, 30, 0);
  const { longitude } = calcPlanetLongitude(jdUt, "sun", "lahiri");
  const ayanamsa = calcAyanamsa(jdUt, "lahiri");
  return {
    ok: true,
    jdUt,
    sunLongitude: longitude,
    ayanamsa,
    engine: ENGINE_VERSION,
    ephemeris: getEphemerisMode(),
  };
}
