import { DateTime } from "luxon";
import {
  calcPlanetLongitude,
  calcTrueNode,
  utcPartsToJd,
} from "@/lib/astrology/swe";
import { longitudeToSign } from "@/lib/astrology/signs";
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
  }>;
  hits: TransitHit[];
};

const ORB_DEG = 2.5;

function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b + 180) % 360) - 180);
  return d;
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
  natalPlanets: PlanetPosition[]
): TransitSnapshot {
  const jdUt = toJdFromDate(asOfDate);
  const positions: TransitSnapshot["planets"] = [];

  for (const id of CLASSICAL) {
    const { longitude, speed } = calcPlanetLongitude(jdUt, id, "lahiri");
    const meta = longitudeToSign(longitude);
    positions.push({
      id,
      longitude,
      sign: meta.sign,
      degreeInSign: meta.degreeInSign,
      retrograde: speed < 0,
    });
  }
  const nodes = calcTrueNode(jdUt, "lahiri");
  const rahuMeta = longitudeToSign(nodes.rahu);
  const ketuMeta = longitudeToSign(nodes.ketu);
  positions.push({
    id: "rahu",
    longitude: nodes.rahu,
    sign: rahuMeta.sign,
    degreeInSign: rahuMeta.degreeInSign,
    retrograde: nodes.rahuSpeed < 0,
  });
  positions.push({
    id: "ketu",
    longitude: nodes.ketu,
    sign: ketuMeta.sign,
    degreeInSign: ketuMeta.degreeInSign,
    retrograde: true,
  });

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

  return { asOfDate, planets: positions, hits: hits.slice(0, 12) };
}
