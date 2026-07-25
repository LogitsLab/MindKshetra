import { DateTime } from "luxon";
import {
  calcPlanetLongitude,
  calcTrueNode,
  utcPartsToJd,
} from "@/lib/astrology/swe";
import { longitudeToSign, wholeSignHouse } from "@/lib/astrology/signs";
import type { PlanetId, PlanetPosition, SignId } from "@/lib/astrology/types";

const CLASSICAL: Exclude<PlanetId, "ascendant" | "ketu" | "rahu">[] = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
];

export type TransitHit = {
  transitPlanet: PlanetId;
  natalPlanet: PlanetId;
  orb: number;
  aspect: "conjunction";
};

export type TransitSnapshot = {
  asOfDate: string;
  planets: Array<{
    id: PlanetId;
    longitude: number;
    sign: SignId;
    degreeInSign: number;
    retrograde: boolean;
    house?: number;
  }>;
  hits: TransitHit[];
  emphasis: string[];
};

const ORB_DEG = 2.5;

function angleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 180) % 360) - 180);
}

function toJdFromDate(asOfDate: string): number {
  const dt = DateTime.fromISO(asOfDate, { zone: "utc" }).set({
    hour: 12,
    minute: 0,
    second: 0,
  });
  const { jdUt } = utcPartsToJd(
    dt.year,
    dt.month,
    dt.day,
    dt.hour,
    dt.minute,
    dt.second
  );
  return jdUt;
}

export function computeTransits(
  asOfDate: string,
  natalPlanets: PlanetPosition[],
  natalAscSignIndex: number | null = null
): TransitSnapshot {
  const jdUt = toJdFromDate(asOfDate);
  const positions: TransitSnapshot["planets"] = [];

  for (const id of CLASSICAL) {
    const { longitude, speed } = calcPlanetLongitude(jdUt, id, "lahiri");
    const meta = longitudeToSign(longitude);
    const house =
      natalAscSignIndex != null
        ? wholeSignHouse(meta.signIndex, natalAscSignIndex)
        : undefined;
    positions.push({
      id,
      longitude,
      sign: meta.sign,
      degreeInSign: meta.degreeInSign,
      retrograde: speed < 0,
      house,
    });
  }
  const nodes = calcTrueNode(jdUt, "lahiri");
  for (const [id, lon, retro] of [
    ["rahu", nodes.rahu, nodes.rahuSpeed < 0] as const,
    ["ketu", nodes.ketu, true] as const,
  ]) {
    const meta = longitudeToSign(lon);
    positions.push({
      id,
      longitude: lon,
      sign: meta.sign,
      degreeInSign: meta.degreeInSign,
      retrograde: retro,
      house:
        natalAscSignIndex != null
          ? wholeSignHouse(meta.signIndex, natalAscSignIndex)
          : undefined,
    });
  }

  const hits: TransitHit[] = [];
  for (const t of positions) {
    for (const n of natalPlanets) {
      if (n.id === "ascendant") continue;
      const orb = angleDiff(t.longitude, n.longitude);
      if (orb <= ORB_DEG) {
        hits.push({
          transitPlanet: t.id,
          natalPlanet: n.id,
          orb: Number(orb.toFixed(2)),
          aspect: "conjunction",
        });
      }
    }
  }
  hits.sort((a, b) => a.orb - b.orb);

  const emphasis: string[] = [];
  const jup = positions.find((p) => p.id === "jupiter");
  const sat = positions.find((p) => p.id === "saturn");
  if (jup?.house != null) {
    emphasis.push(
      `Transit Jupiter in house ${jup.house} (${jup.sign})${jup.retrograde ? " R" : ""}`
    );
  }
  if (sat?.house != null) {
    emphasis.push(
      `Transit Saturn in house ${sat.house} (${sat.sign})${sat.retrograde ? " R" : ""}`
    );
  }

  return {
    asOfDate,
    planets: positions,
    hits: hits.slice(0, 12),
    emphasis,
  };
}
