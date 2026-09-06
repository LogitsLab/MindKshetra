import { createGroqHousesCompletion } from "@/lib/groq";
import type {
  ChartPayload,
  HouseReading,
  HouseStrengthLevel,
  PlanetId,
  SignId,
} from "@/lib/astrology/types";

/**
 * House-by-house reading, reasoned by the LLM but bound to the computed chart.
 *
 * Why an LLM and not a score: a rule-based composite kept collapsing every house
 * to "complex" (a 7th-house malefic aspect is near-universal). A reasoning model
 * grounded in the exact placements gives accurate, plain-language verdicts. The
 * result is cached once per chart, so the ~30s / high-reasoning cost is paid once.
 */

const SIGNS: SignId[] = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

const SIGN_LORDS: Record<SignId, PlanetId> = {
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon",
  leo: "sun", virgo: "mercury", libra: "venus", scorpio: "mars",
  sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter",
};

const AREA: Record<number, string> = {
  1: "Self, body, personality, vitality",
  2: "Wealth, speech, family, food",
  3: "Courage, siblings, communication, effort",
  4: "Home, mother, comfort, inner peace",
  5: "Creativity, children, romance, intelligence",
  6: "Health, daily work, service, obstacles, enemies",
  7: "Partnership, marriage, one-to-one relationships",
  8: "Transformation, shared resources, longevity, hidden matters",
  9: "Fortune, dharma, higher learning, teachers, long journeys",
  10: "Career, reputation, status, action in the world",
  11: "Gains, income, friends, networks, hopes",
  12: "Loss, letting go, solitude, expenses, spirituality, liberation",
};

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);
const DUSTHANA = new Set([6, 8, 12]);
const STRENGTHS: HouseStrengthLevel[] = ["weak", "moderate", "strong", "complex"];

function dignityMap(chart: ChartPayload): Partial<Record<PlanetId, string>> {
  const m: Partial<Record<PlanetId, string>> = {};
  for (const d of chart.dignities ?? []) {
    if (d.kind && d.kind !== "neutral") m[d.planet] = d.kind;
  }
  return m;
}

/** A compact, unambiguous facts block the model must reason from — nothing else. */
export function buildHouseFacts(chart: ChartPayload): string {
  const asc = chart.ascendant;
  const ascIdx = asc ? asc.signIndex : 0;
  const dig = dignityMap(chart);
  const lines: string[] = [
    `Ascendant (lagna): ${asc?.sign ?? "unknown"}. Sidereal (Lahiri).`,
  ];
  for (let h = 1; h <= 12; h++) {
    const signIdx = (ascIdx + (h - 1)) % 12;
    const sign = SIGNS[signIdx];
    const occ = (chart.planets ?? [])
      .filter((p) => p.house === h)
      .map(
        (p) =>
          `${p.id}${dig[p.id] ? ` (${dig[p.id]})` : ""} in ${p.sign}${
            p.retrograde ? ", retrograde" : ""
          }`
      );
    const lord = SIGN_LORDS[sign];
    const lp = (chart.planets ?? []).find((p) => p.id === lord);
    const kind = TRIKONA.has(h)
      ? "trikona"
      : KENDRA.has(h)
        ? "kendra"
        : DUSTHANA.has(h)
          ? "dusthana"
          : "neutral";
    lines.push(
      `House ${h} [${AREA[h]}] — sign ${sign} (${kind}); ` +
        `planets: ${occ.join("; ") || "none"}; ` +
        `lord ${lord} in house ${lp?.house ?? "?"} (${lp?.sign ?? "?"})${
          lp?.retrograde ? ", retrograde" : ""
        }.`
    );
  }
  const asp = (chart.aspects ?? []).map((a) => `${a.from}→${a.to}`).join(", ");
  if (asp) lines.push(`Aspects (graha drishti): ${asp}.`);
  return lines.join("\n");
}

function systemPrompt(language: "en" | "hi"): string {
  const lang = language === "hi" ? "Hindi (Devanagari)" : "English";
  return `You are an expert Vedic (Parashari) astrologer writing a house-by-house reading for a beginner, in ${lang}.

Rules:
- Use ONLY the facts provided. Never invent a planet, sign, house, or placement.
- Judge each of the 12 houses' overall strength as EXACTLY one of: "weak", "moderate", "strong", "complex". Use "complex" only for genuine tension (real potential AND a real affliction such as a debilitated lord, a strong planet in a dusthana, or combustion) — do NOT default to complex.
- "why": one plain sentence citing the concrete factors (dignity, house nature kendra/trikona/dusthana, lord placement, key aspects, retrograde/combustion).
- "meaning": two plain sentences on what this means for the person's life area — warm, specific, non-fatalistic. No jargon; write for someone new to astrology.
- Do not name school systems (Vedic/KP), do not moralize, do not predict disasters.

Return STRICT JSON only, no prose:
{"houses":[{"house":1,"strength":"...","why":"...","meaning":"..."}, ... all 12 in order]}`;
}

function coerce(raw: string): HouseReading[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const arr = (parsed as { houses?: unknown })?.houses;
  if (!Array.isArray(arr)) return null;
  const byHouse = new Map<number, HouseReading>();
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const house = Number(o.house);
    const strength = String(o.strength) as HouseStrengthLevel;
    if (!Number.isInteger(house) || house < 1 || house > 12) continue;
    if (!STRENGTHS.includes(strength)) continue;
    byHouse.set(house, {
      house,
      strength,
      why: String(o.why ?? "").trim(),
      meaning: String(o.meaning ?? "").trim(),
    });
  }
  if (byHouse.size < 12) return null;
  return Array.from({ length: 12 }, (_, i) => byHouse.get(i + 1)!);
}

/** Deterministic fallback if the model is unavailable or returns bad JSON. */
function fallbackHouses(chart: ChartPayload, language: "en" | "hi"): HouseReading[] {
  const dig = dignityMap(chart);
  return Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    const occ = (chart.planets ?? []).filter((p) => p.house === h);
    const kind = TRIKONA.has(h) || KENDRA.has(h) ? "supportive" : DUSTHANA.has(h) ? "testing" : "neutral";
    const debil = occ.some((p) => dig[p.id] === "debilitated");
    const dignified = occ.some((p) => dig[p.id] === "exalted" || dig[p.id] === "own");
    const strength: HouseStrengthLevel =
      dignified && (DUSTHANA.has(h) || debil)
        ? "complex"
        : dignified || TRIKONA.has(h) || KENDRA.has(h)
          ? "strong"
          : DUSTHANA.has(h) || debil
            ? "weak"
            : "moderate";
    const why =
      language === "hi"
        ? `भाव ${h} ${kind === "supportive" ? "शुभ" : kind === "testing" ? "चुनौतीपूर्ण" : "सामान्य"} है${occ.length ? `; ग्रह: ${occ.map((p) => p.id).join(", ")}` : ""}।`
        : `House ${h} is ${kind}${occ.length ? `; planets: ${occ.map((p) => p.id).join(", ")}` : ""}.`;
    const meaning = language === "hi" ? AREA[h] : AREA[h];
    return { house: h, strength, why, meaning };
  });
}

export async function writeHouseReadings(
  chart: ChartPayload,
  language: "en" | "hi" = "en"
): Promise<NonNullable<ChartPayload["housesText"]>> {
  // Houses need an exact birth time (ascendant); without it, don't fabricate.
  if (chart.tobUnknown || !chart.ascendant) {
    return {
      language,
      houses: fallbackHouses(chart, language),
      generatedAt: new Date().toISOString(),
      source: "rules",
    };
  }
  try {
    const raw = await createGroqHousesCompletion([
      { role: "system", content: systemPrompt(language) },
      { role: "user", content: buildHouseFacts(chart) },
    ]);
    const houses = coerce(raw);
    if (houses) {
      return { language, houses, generatedAt: new Date().toISOString(), source: "llm" };
    }
  } catch (err) {
    console.error("[astrology/houses]", err instanceof Error ? err.message : err);
  }
  return {
    language,
    houses: fallbackHouses(chart, language),
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}
