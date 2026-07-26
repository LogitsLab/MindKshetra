import type { ChartPayload, PlanetPosition } from "@/lib/astrology/types";

/**
 * ceo/T11 — Kundli Milan (Ashtakoota compatibility).
 *
 * Classical eight-fold matching between two charts. Every input comes from the
 * moon's nakshatra and rasi, which `computeChart` already produces — no new
 * ephemeris work, no new native calls.
 *
 *   chart A ─┐
 *            ├─▶ 8 kootas ─▶ score /36 ─▶ verdict
 *   chart B ─┘
 *
 * ── Read this before shipping any UI on top ────────────────────────────────
 * This is a TRADITIONAL scoring system, not a prediction, and the app must not
 * present it as one. It has real cultural weight in India, which is exactly why
 * it needs care: a low score shown bluntly can do harm to real relationships.
 *
 * So `verdict()` deliberately avoids "incompatible" and returns descriptive
 * bands with an explicit caveat. Nadi dosha in particular is the single largest
 * component (8 of 36) and is routinely cancelled by classical exceptions this
 * implementation does not model — so the code says so rather than letting a
 * number imply a certainty it has not earned.
 */

const NAKSHATRA_COUNT = 27;

/** Varna rank by moon sign index (0=aries). Brahmin 4 … Shudra 1. */
const VARNA_BY_RASI = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4];

/** Vashya group per rasi index. */
const VASHYA_BY_RASI = [
  "chatushpada", "chatushpada", "manav", "jalchar", "vanchar", "manav",
  "manav", "keet", "manav", "chatushpada", "manav", "jalchar",
];

/** Yoni animal + gender per nakshatra index (0=ashwini). */
const YONI = [
  "horse-m", "elephant-f", "sheep-f", "serpent-m", "serpent-f", "dog-f",
  "cat-f", "sheep-m", "cat-m", "rat-m", "rat-f", "cow-f",
  "buffalo-f", "tiger-f", "buffalo-m", "tiger-m", "deer-m", "deer-f",
  "dog-m", "monkey-f", "mongoose-m", "monkey-m", "lion-f", "horse-f",
  "lion-m", "cow-m", "elephant-m",
];

/** Planetary friendship graha for each rasi lord. */
const RASI_LORD = [
  "mars", "venus", "mercury", "moon", "sun", "mercury",
  "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
];

const FRIENDS: Record<string, string[]> = {
  sun: ["moon", "mars", "jupiter"],
  moon: ["sun", "mercury"],
  mars: ["sun", "moon", "jupiter"],
  mercury: ["sun", "venus"],
  jupiter: ["sun", "moon", "mars"],
  venus: ["mercury", "saturn"],
  saturn: ["mercury", "venus"],
};

/** Gana per nakshatra index: deva / manushya / rakshasa. */
const GANA = [
  "deva", "manushya", "rakshasa", "manushya", "deva", "manushya",
  "deva", "deva", "rakshasa", "rakshasa", "manushya", "manushya",
  "deva", "rakshasa", "deva", "rakshasa", "deva", "rakshasa",
  "rakshasa", "manushya", "manushya", "deva", "rakshasa", "rakshasa",
  "manushya", "manushya", "deva",
];

/** Nadi per nakshatra index: aadi / madhya / antya. */
const NADI = [
  "aadi", "madhya", "antya", "aadi", "madhya", "antya",
  "aadi", "madhya", "antya", "antya", "madhya", "aadi",
  "antya", "madhya", "aadi", "aadi", "madhya", "antya",
  "aadi", "madhya", "antya", "antya", "madhya", "aadi",
  "antya", "madhya", "aadi",
];

export type Koota = {
  name: string;
  score: number;
  max: number;
  note: string;
};

export type CompatibilityResult = {
  kootas: Koota[];
  total: number;
  max: 36;
  band: "excellent" | "good" | "acceptable" | "needs-discussion";
  /** Always present. This system is traditional guidance, not a prediction. */
  caveat: string;
  /** True when Nadi scored 0 — the most consequential single koota. */
  nadiDosha: boolean;
};

function moonOf(chart: ChartPayload): PlanetPosition | null {
  return chart.planets.find((p) => p.id === "moon") ?? null;
}

function nakIndex(p: PlanetPosition): number {
  return ((p.nakshatraIndex ?? 0) % NAKSHATRA_COUNT + NAKSHATRA_COUNT) % NAKSHATRA_COUNT;
}

function varna(a: number, b: number): Koota {
  // Groom's varna should be >= bride's.
  const score = VARNA_BY_RASI[a] >= VARNA_BY_RASI[b] ? 1 : 0;
  return { name: "Varna", score, max: 1, note: "Temperament and work orientation." };
}

function vashya(a: number, b: number): Koota {
  const score = VASHYA_BY_RASI[a] === VASHYA_BY_RASI[b] ? 2 : a === b ? 2 : 1;
  return { name: "Vashya", score, max: 2, note: "Mutual influence and give-and-take." };
}

function tara(a: number, b: number): Koota {
  const fwd = ((b - a + NAKSHATRA_COUNT) % NAKSHATRA_COUNT) + 1;
  const rev = ((a - b + NAKSHATRA_COUNT) % NAKSHATRA_COUNT) + 1;
  const ok = (n: number) => ![3, 5, 7].includes(n % 9);
  const score = (ok(fwd) ? 1.5 : 0) + (ok(rev) ? 1.5 : 0);
  return { name: "Tara", score, max: 3, note: "Timing and shared fortune." };
}

function yoni(a: number, b: number): Koota {
  const [aa, ag] = YONI[a].split("-");
  const [ba, bg] = YONI[b].split("-");
  let score = 4;
  if (aa !== ba) score = ag === bg ? 2 : 3;
  if (aa === ba && ag === bg) score = 3;
  return { name: "Yoni", score, max: 4, note: "Physical and instinctive compatibility." };
}

function grahaMaitri(a: number, b: number): Koota {
  const la = RASI_LORD[a];
  const lb = RASI_LORD[b];
  if (la === lb) return { name: "Graha Maitri", score: 5, max: 5, note: "Mental affinity." };
  const aFriend = FRIENDS[la]?.includes(lb);
  const bFriend = FRIENDS[lb]?.includes(la);
  const score = aFriend && bFriend ? 5 : aFriend || bFriend ? 3 : 0;
  return { name: "Graha Maitri", score, max: 5, note: "Mental affinity and shared outlook." };
}

function gana(a: number, b: number): Koota {
  const ga = GANA[a];
  const gb = GANA[b];
  let score = 0;
  if (ga === gb) score = 6;
  else if ((ga === "deva" && gb === "manushya") || (ga === "manushya" && gb === "deva")) score = 5;
  else if (ga === "rakshasa" || gb === "rakshasa") score = 1;
  return { name: "Gana", score, max: 6, note: "Temperament and social nature." };
}

function bhakoot(a: number, b: number): Koota {
  const diff = ((b - a + 12) % 12) + 1;
  const bad = [2, 12, 5, 9, 6, 8];
  const score = bad.includes(diff) ? 0 : 7;
  return { name: "Bhakoot", score, max: 7, note: "Shared direction in life." };
}

function nadi(a: number, b: number): Koota {
  const score = NADI[a] === NADI[b] ? 0 : 8;
  return {
    name: "Nadi",
    score,
    max: 8,
    note:
      score === 0
        ? "Same nadi. Classical texts list several exceptions that cancel this; they are not modelled here."
        : "Constitutional complement.",
  };
}

export function computeCompatibility(
  chartA: ChartPayload,
  chartB: ChartPayload
): CompatibilityResult | null {
  const ma = moonOf(chartA);
  const mb = moonOf(chartB);
  // No moon means no Ashtakoota. Returning null is correct: the UI must say it
  // cannot compute rather than showing a misleading zero.
  if (!ma || !mb) return null;

  const na = nakIndex(ma);
  const nb = nakIndex(mb);
  const ra = ma.signIndex ?? 0;
  const rb = mb.signIndex ?? 0;

  const kootas = [
    varna(ra, rb),
    vashya(ra, rb),
    tara(na, nb),
    yoni(na, nb),
    grahaMaitri(ra, rb),
    gana(na, nb),
    bhakoot(ra, rb),
    nadi(na, nb),
  ];

  const total = kootas.reduce((sum, k) => sum + k.score, 0);
  const band =
    total >= 28 ? "excellent" : total >= 21 ? "good" : total >= 18 ? "acceptable" : "needs-discussion";

  return {
    kootas,
    total,
    max: 36,
    band,
    nadiDosha: kootas[7].score === 0,
    caveat:
      "Ashtakoota is traditional guidance, not a prediction. It weighs eight " +
      "factors from the moon alone and says nothing about how two people " +
      "actually treat each other. Many classical exceptions that cancel a low " +
      "score are not modelled here. Treat a number as a conversation starter.",
  };
}
