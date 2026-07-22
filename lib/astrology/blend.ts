import type {
  AreaFact,
  BlendedVerdict,
  ChartPayload,
  DashaPeriod,
  EngineVerdict,
  LifeArea,
  PlanetId,
  SignId,
} from "@/lib/astrology/types";
import type { HouseSignificators } from "@/lib/astrology/kp";
import { SIGNS } from "@/lib/astrology/signs";

export const LIFE_AREAS: LifeArea[] = [
  "career",
  "marriage",
  "health",
  "finance",
  "education",
  "travel",
];

/** Classical house focus per life area. */
export const VEDIC_HOUSES: Record<LifeArea, number[]> = {
  career: [10, 6, 2],
  marriage: [7, 2, 11],
  health: [1, 6, 8],
  finance: [2, 11, 5],
  education: [4, 5, 9],
  travel: [3, 9, 12],
};

export const AREA_LABEL: Record<LifeArea, string> = {
  career: "career and vocation",
  marriage: "relationships and partnership",
  health: "vitality and wellbeing",
  finance: "wealth and resources",
  education: "learning and wisdom",
  travel: "movement and journeys",
};

const SIGN_LORDS: Record<SignId, PlanetId> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

const PLANET_NATURE: Partial<Record<PlanetId, string>> = {
  sun: "authority, visibility, and purpose",
  moon: "emotions, care, and daily rhythm",
  mars: "drive, conflict, and decisive action",
  mercury: "communication, skill, and adaptability",
  jupiter: "growth, guidance, and opportunity",
  venus: "harmony, affection, and aesthetic value",
  saturn: "structure, delay, and long effort",
  rahu: "ambition, disruption, and unconventional paths",
  ketu: "detachment, insight, and past patterns",
};

function houseSign(ascSignIndex: number | null, house: number): SignId | null {
  if (ascSignIndex == null) return null;
  return SIGNS[(ascSignIndex + house - 1) % 12];
}

function houseLord(ascSignIndex: number | null, house: number): PlanetId | null {
  const sign = houseSign(ascSignIndex, house);
  return sign ? SIGN_LORDS[sign] : null;
}

function findPlanet(chart: ChartPayload, id: PlanetId) {
  return chart.planets.find((p) => p.id === id);
}

function occupantsOf(chart: ChartPayload, house: number): PlanetId[] {
  return chart.planets
    .filter((p) => p.house === house)
    .map((p) => p.id);
}

function currentLords(chart: ChartPayload): {
  maha: PlanetId | null;
  antar: PlanetId | null;
  mahaWindow: string | null;
  antarWindow: string | null;
} {
  const maha = chart.overview.currentMaha;
  const antar = chart.overview.currentAntar;
  return {
    maha: maha?.lord ?? null,
    antar: antar?.lord ?? null,
    mahaWindow: maha ? `${maha.start} → ${maha.end}` : null,
    antarWindow: antar ? `${antar.start} → ${antar.end}` : null,
  };
}

function buildHouseFact(
  chart: ChartPayload,
  house: number,
  significators: HouseSignificators[] | null
): AreaFact {
  const ascIdx = chart.ascendant?.signIndex ?? null;
  const sign = houseSign(ascIdx, house);
  const lord = houseLord(ascIdx, house);
  const lordPos = lord ? findPlanet(chart, lord) : undefined;
  const cusp = chart.kp?.cusps.find((c) => c.house === house);
  return {
    house,
    sign,
    lord,
    lordHouse: lordPos?.house ?? null,
    lordSign: lordPos?.sign ?? null,
    occupants: occupantsOf(chart, house),
    cuspStarLord: cusp?.starLord,
    cuspSubLord: cusp?.subLord,
  };
}

function describeHouse(fact: AreaFact): string {
  const bits: string[] = [`House ${fact.house}`];
  if (fact.sign) bits.push(`in ${fact.sign}`);
  if (fact.lord) {
    bits.push(
      `ruled by ${fact.lord}` +
        (fact.lordHouse != null ? ` (placed in house ${fact.lordHouse}` : "") +
        (fact.lordSign ? ` / ${fact.lordSign}` : "") +
        (fact.lordHouse != null ? ")" : "")
    );
  }
  if (fact.occupants.length) {
    bits.push(`occupied by ${fact.occupants.join(", ")}`);
  } else {
    bits.push("no planet occupying");
  }
  if (fact.cuspSubLord) {
    bits.push(`cusp sub-lord ${fact.cuspSubLord}`);
  }
  return bits.join("; ");
}

function strengthsFromFacts(
  lifeArea: LifeArea,
  facts: AreaFact[],
  maha: PlanetId | null,
  antar: PlanetId | null
): string[] {
  const out: string[] = [];
  for (const f of facts) {
    if (f.occupants.includes("jupiter")) {
      out.push(`Jupiter in house ${f.house} supports expansion in ${AREA_LABEL[lifeArea]}.`);
    }
    if (f.occupants.includes("venus") && (lifeArea === "marriage" || lifeArea === "finance")) {
      out.push(`Venus in house ${f.house} favours ease and attraction here.`);
    }
    if (f.lord && (f.lord === maha || f.lord === antar)) {
      out.push(`House ${f.house} lord ${f.lord} is active in the current dasha.`);
    }
    if (f.lordHouse === 10 || f.lordHouse === 11 || f.lordHouse === 9) {
      out.push(
        `Lord of house ${f.house} placed in house ${f.lordHouse} links this area to visible results.`
      );
    }
  }
  return out.slice(0, 4);
}

function tensionsFromFacts(lifeArea: LifeArea, facts: AreaFact[]): string[] {
  const out: string[] = [];
  for (const f of facts) {
    if (f.occupants.includes("saturn")) {
      out.push(
        `Saturn in house ${f.house} can slow ${AREA_LABEL[lifeArea]} and demand patience.`
      );
    }
    if (f.occupants.includes("mars") && (lifeArea === "marriage" || lifeArea === "health")) {
      out.push(`Mars in house ${f.house} adds heat — assertiveness or friction.`);
    }
    if (f.occupants.includes("rahu") || f.occupants.includes("ketu")) {
      const node = f.occupants.includes("rahu") ? "rahu" : "ketu";
      out.push(
        `${node} in house ${f.house} brings unconventional or unsettled patterns.`
      );
    }
    if (f.lordHouse === 6 || f.lordHouse === 8 || f.lordHouse === 12) {
      out.push(
        `Lord of house ${f.house} in house ${f.lordHouse} can complicate outcomes until effort lands.`
      );
    }
  }
  return out.slice(0, 4);
}

export function buildVedicVerdicts(
  chart: ChartPayload,
  significators: HouseSignificators[] | null
): EngineVerdict[] {
  const { maha, antar, mahaWindow, antarWindow } = currentLords(chart);
  const ascIdx = chart.ascendant?.signIndex ?? null;

  return LIFE_AREAS.map((lifeArea) => {
    const houses = VEDIC_HOUSES[lifeArea];
    const houseDetails = houses.map((h) =>
      buildHouseFact(chart, h, significators)
    );
    const strengths = strengthsFromFacts(lifeArea, houseDetails, maha, antar);
    const tensions = tensionsFromFacts(lifeArea, houseDetails);
    const narrativeBullets = houseDetails.map(describeHouse);

    const occupants = houseDetails.flatMap((h) => h.occupants);
    const lords = houseDetails
      .map((h) => h.lord)
      .filter(Boolean) as PlanetId[];

    const themeParts: string[] = [];
    themeParts.push(
      `${AREA_LABEL[lifeArea]} is read mainly from houses ${houses.join(", ")}.`
    );
    if (occupants.length) {
      themeParts.push(
        `Key occupants: ${Array.from(new Set(occupants)).join(", ")}.`
      );
    }
    if (lords.length) {
      themeParts.push(
        `Relevant house lords: ${Array.from(new Set(lords)).join(", ")}.`
      );
      for (const lord of Array.from(new Set(lords)).slice(0, 3)) {
        const nature = PLANET_NATURE[lord];
        if (nature) themeParts.push(`${lord} brings ${nature}.`);
      }
    }
    if (ascIdx == null) {
      themeParts.push(
        "Birth time unknown — house lords and occupancy are approximate or unavailable."
      );
    }

    const dashaSupports = Boolean(
      (maha && (occupants.includes(maha) || lords.includes(maha))) ||
        (antar && (occupants.includes(antar) || lords.includes(antar)))
    );

    const timing = maha
      ? dashaSupports
        ? `Current ${maha}${antar ? `–${antar}` : ""} dasha (${mahaWindow}${
            antarWindow ? `; antar ${antarWindow}` : ""
          }) activates this area — nearer-term movement is more likely.`
        : `Current ${maha}${antar ? `–${antar}` : ""} dasha (${mahaWindow}) is not a primary activator here — themes develop more gradually.`
      : "Dasha timing is limited without a precise birth time.";

    return {
      lifeArea,
      theme: themeParts.join(" "),
      timing,
      signals: [
        ...occupants.map((p) => `occ:${p}`),
        ...lords.map((p) => `lord:${p}`),
        ...(maha ? [`maha:${maha}`] : []),
        ...(antar ? [`antar:${antar}`] : []),
      ],
      facts: {
        focusHouses: houses,
        houseDetails,
        dashaSupports,
        mahaLord: maha,
        antarLord: antar,
        mahaWindow,
        antarWindow,
        significators: [],
        strengths,
        tensions,
        narrativeBullets,
      },
    };
  });
}

export function buildKpVerdicts(
  chart: ChartPayload,
  significators: HouseSignificators[]
): EngineVerdict[] {
  const { maha, antar, mahaWindow, antarWindow } = currentLords(chart);

  return LIFE_AREAS.map((lifeArea) => {
    const houses = VEDIC_HOUSES[lifeArea];
    const houseDetails = houses.map((h) =>
      buildHouseFact(chart, h, significators)
    );
    const sigs = significators
      .filter((s) => houses.includes(s.house))
      .flatMap((s) => s.significators);
    const unique = Array.from(new Set(sigs));
    const dashaSupports = Boolean(
      (maha && unique.includes(maha)) || (antar && unique.includes(antar))
    );

    const strengths: string[] = [];
    const tensions: string[] = [];
    if (dashaSupports) {
      strengths.push(
        `Current dasha lord(s) appear among significators for houses ${houses.join("/")}.`
      );
    } else {
      tensions.push(
        `Current dasha lords are not primary significators for houses ${houses.join("/")} — timing is softer.`
      );
    }
    for (const h of houseDetails) {
      if (h.cuspSubLord) {
        strengths.push(
          `House ${h.house} cusp sub-lord is ${h.cuspSubLord} — results lean toward that planet’s agenda.`
        );
      }
    }

    const narrativeBullets = [
      `Significators for ${AREA_LABEL[lifeArea]}: ${unique.slice(0, 8).join(", ") || "none clear"}.`,
      ...houseDetails.map(
        (h) =>
          `House ${h.house} cusp: star ${h.cuspStarLord ?? "—"}, sub ${h.cuspSubLord ?? "—"}.`
      ),
    ];

    return {
      lifeArea,
      theme: `Significators shaping ${AREA_LABEL[lifeArea]}: ${
        unique.slice(0, 6).join(", ") || "diffuse"
      }.`,
      timing: dashaSupports
        ? `Dasha lords participate in significators — nearer-term events for this area are more activated (${mahaWindow}).`
        : `Dasha lords sit outside primary significators — expect quieter timing through ${mahaWindow ?? "this period"}.`,
      signals: unique.slice(0, 10).map((p) => `sig:${p}`),
      facts: {
        focusHouses: houses,
        houseDetails,
        dashaSupports,
        mahaLord: maha,
        antarLord: antar,
        mahaWindow,
        antarWindow,
        significators: unique,
        strengths: strengths.slice(0, 4),
        tensions: tensions.slice(0, 4),
        narrativeBullets,
      },
    };
  });
}

function overlap(a: string[], b: string[]): number {
  const bs = new Set(b);
  return a.filter((x) => bs.has(x)).length;
}

export function blendVerdicts(
  vedic: EngineVerdict[],
  kp: EngineVerdict[]
): BlendedVerdict[] {
  return LIFE_AREAS.map((lifeArea) => {
    const v = vedic.find((x) => x.lifeArea === lifeArea)!;
    const k = kp.find((x) => x.lifeArea === lifeArea)!;
    const shared = overlap(v.signals, k.signals);
    const confidence: BlendedVerdict["confidence"] =
      shared >= 2 || (v.facts.dashaSupports && k.facts.dashaSupports)
        ? "high"
        : shared === 1 || v.facts.dashaSupports || k.facts.dashaSupports
          ? "medium"
          : "low";

    const strengths = Array.from(
      new Set([...v.facts.strengths, ...k.facts.strengths])
    ).slice(0, 5);
    const tensions = Array.from(
      new Set([...v.facts.tensions, ...k.facts.tensions])
    ).slice(0, 5);
    const narrativeBullets = [
      ...v.facts.narrativeBullets,
      ...k.facts.narrativeBullets.filter((b) => b.startsWith("Significators")),
    ].slice(0, 8);

    return {
      lifeArea,
      theme: v.theme,
      timing: k.timing,
      confidence,
      notes: [
        `theme_source:chart_houses`,
        `timing_source:significators_dasha`,
        `signal_overlap:${shared}`,
      ],
      strengths,
      tensions,
      narrativeBullets,
      dashaSupports: v.facts.dashaSupports || k.facts.dashaSupports,
      mahaLord: v.facts.mahaLord,
      antarLord: v.facts.antarLord,
      mahaWindow: v.facts.mahaWindow,
      antarWindow: v.facts.antarWindow,
    };
  });
}

export function buildAllVerdicts(
  chart: ChartPayload,
  significators: HouseSignificators[] | null
): ChartPayload["verdicts"] {
  const vedic = buildVedicVerdicts(chart, significators);
  const kp =
    significators && !chart.tobUnknown
      ? buildKpVerdicts(chart, significators)
      : LIFE_AREAS.map((lifeArea) => ({
          lifeArea,
          theme: `${AREA_LABEL[lifeArea]} timing needs a known birth time for cusp significators.`,
          timing: "Birth time unknown — precise event timing disabled.",
          signals: [],
          facts: {
            focusHouses: VEDIC_HOUSES[lifeArea],
            houseDetails: [],
            dashaSupports: false,
            mahaLord: chart.overview.currentMaha?.lord ?? null,
            antarLord: chart.overview.currentAntar?.lord ?? null,
            mahaWindow: chart.overview.currentMaha
              ? `${chart.overview.currentMaha.start} → ${chart.overview.currentMaha.end}`
              : null,
            antarWindow: null,
            significators: [],
            strengths: [],
            tensions: [
              "Birth time unknown — Ascendant and house-based timing are limited.",
            ],
            narrativeBullets: [],
          },
        }));
  const blended = blendVerdicts(vedic, kp);
  return { vedic, kp, blended };
}

export function summarizeDasha(period: DashaPeriod | null): string {
  if (!period) return "none";
  return `${period.lord} (${period.start} → ${period.end})`;
}

/** Compact factual pack for chat system prompt — no system labels. */
export function buildChartChatContext(chart: ChartPayload): string {
  const planets = chart.planets
    .map(
      (p) =>
        `${p.id}: ${p.sign} ${p.degreeInSign.toFixed(1)}° / ${p.nakshatra} pada ${p.pada}` +
        (p.house != null ? ` / house ${p.house}` : "") +
        (p.retrograde ? " (R)" : "")
    )
    .join("\n");

  const yogas = chart.yogas
    .filter((y) => y.present)
    .map((y) => `${y.name}: ${y.detail}`)
    .join("\n");

  const areas = chart.verdicts.blended
    .map(
      (b) =>
        `## ${b.lifeArea} (confidence ${b.confidence})\nTheme: ${b.theme}\nTiming: ${b.timing}\nStrengths: ${b.strengths.join("; ") || "—"}\nWatch: ${b.tensions.join("; ") || "—"}\nFacts:\n- ${b.narrativeBullets.join("\n- ")}`
    )
    .join("\n\n");

  return [
    `Name: ${chart.birth.name || "Native"}`,
    `Report date (as of): ${chart.asOfDate}`,
    `DOB: ${chart.birth.dob}${chart.birth.tob ? ` ${chart.birth.tob}` : ""} (${chart.birth.placeLabel})`,
    `TZ: ${chart.birth.ianaTz} (offset ${chart.birth.utcOffsetMinutes} min)`,
    `TOB unknown: ${chart.tobUnknown}`,
    `Ascendant: ${chart.overview.ascendantSign ?? "unknown"}`,
    `Sun: ${chart.overview.sunSign}; Moon: ${chart.overview.moonSign}`,
    `Current mahadasha: ${summarizeDasha(chart.overview.currentMaha)}`,
    `Current antardasha: ${summarizeDasha(chart.overview.currentAntar)}`,
    `Current pratyantardasha: ${summarizeDasha(chart.overview.currentPratyantar)}`,
    `Ayanamsa (Lahiri): ${chart.ayanamsa.toFixed(4)}°`,
    "",
    "Planets:",
    planets,
    "",
    "Active yogas/doshas:",
    yogas || "none flagged",
    "",
    "Life-area analysis:",
    areas,
  ].join("\n");
}
