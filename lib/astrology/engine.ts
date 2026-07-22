import { DateTime } from "luxon";
import { buildAllVerdicts } from "@/lib/astrology/blend";
import { buildVimshottariTree, findCurrentDasha } from "@/lib/astrology/dasha";
import { parseUtcIso, resolveBirthInstant } from "@/lib/astrology/geo";
import {
  enrichKpCusps,
  enrichKpPlanets,
  houseSignificators,
} from "@/lib/astrology/kp";
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
  utcPartsToJd,
} from "@/lib/astrology/swe";
import { ENGINE_VERSION } from "@/lib/astrology/types";
import type {
  BirthInput,
  ChartPayload,
  HouseCusp,
  PlanetId,
  PlanetPosition,
} from "@/lib/astrology/types";
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

  const ayanamsa = calcAyanamsa(jdUt);
  const tobUnknown = birth.tobUnknown;

  let placidusCusps: HouseCusp[] | null = null;
  let wholeSignHouses: HouseCusp[] | null = null;
  let ascendant: PlanetPosition | null = null;
  let ascSignIndex: number | null = null;

  if (!tobUnknown) {
    const { cusps, ascmc } = calcPlacidusCusps(jdUt, birth.lat, birth.lng);
    ascSignIndex = longitudeToSign(ascmc[0]).signIndex;
    ascendant = toPosition("ascendant", ascmc[0], 0, ascSignIndex);
    placidusCusps = cusps.map((longitude, i) => {
      const meta = longitudeToSign(longitude);
      return {
        house: i + 1,
        longitude,
        sign: meta.sign,
        signIndex: meta.signIndex,
      };
    });
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
  }

  const planets: PlanetPosition[] = [];
  for (const id of CLASSICAL) {
    const { longitude, speed } = calcPlanetLongitude(jdUt, id);
    planets.push(toPosition(id, longitude, speed, ascSignIndex));
  }
  const nodes = calcTrueNode(jdUt);
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

  let kp: ChartPayload["kp"] = null;
  let significators = null;
  if (placidusCusps && ascSignIndex != null) {
    const kpCusps = enrichKpCusps(placidusCusps);
    const kpPlanets = enrichKpPlanets(planets);
    kp = { cusps: kpCusps, planets: kpPlanets };
    significators = houseSignificators(kpCusps, planets, ascSignIndex);
  }

  const base: ChartPayload = {
    engineVersion: ENGINE_VERSION,
    computedAt: DateTime.utc().toISO()!,
    asOfDate,
    birth: {
      ...birth,
      ianaTz: resolved.ianaTz,
      utcOffsetMinutes: resolved.utcOffsetMinutes,
    },
    jdUt,
    ayanamsa,
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
} {
  // 1990-06-15 06:30:00 UTC
  const { jdUt } = utcPartsToJd(1990, 6, 15, 6, 30, 0);
  const { longitude } = calcPlanetLongitude(jdUt, "sun");
  const ayanamsa = calcAyanamsa(jdUt);
  return {
    ok: true,
    jdUt,
    sunLongitude: longitude,
    ayanamsa,
    engine: ENGINE_VERSION,
  };
}
