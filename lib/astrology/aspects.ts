import type { PlanetId, PlanetPosition } from "@/lib/astrology/types";

export type GrahaAspect = {
  from: PlanetId;
  to: PlanetId;
  housesApart: number;
  kind: "full" | "special";
  label: string;
};

/** Classical full aspect = 7th from planet. Special aspects by planet. */
const SPECIAL: Partial<Record<PlanetId, number[]>> = {
  mars: [4, 8],
  jupiter: [5, 9],
  saturn: [3, 10],
};

function houseDistance(fromHouse: number, toHouse: number): number {
  return ((toHouse - fromHouse + 12) % 12) + 1;
}

/**
 * Graha drishti using whole-sign house counts from each planet's house.
 */
export function computeGrahaDrishti(planets: PlanetPosition[]): GrahaAspect[] {
  const withHouse = planets.filter(
    (p) => p.house != null && p.id !== "ascendant"
  );
  const out: GrahaAspect[] = [];

  for (const from of withHouse) {
    if (from.id === "rahu" || from.id === "ketu") continue;
    const specials = SPECIAL[from.id] || [];
    for (const to of withHouse) {
      if (to.id === from.id) continue;
      const dist = houseDistance(from.house!, to.house!);
      if (dist === 7) {
        out.push({
          from: from.id,
          to: to.id,
          housesApart: 7,
          kind: "full",
          label: `${from.id} aspects ${to.id} (7th)`,
        });
      } else if (specials.includes(dist)) {
        out.push({
          from: from.id,
          to: to.id,
          housesApart: dist,
          kind: "special",
          label: `${from.id} aspects ${to.id} (${dist}th)`,
        });
      }
    }
  }
  return out;
}
