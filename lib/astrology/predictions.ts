import {
  GROQ_CHAT_URL,
  GROQ_MODEL,
  stripThinkBlocks,
} from "@/lib/groq";
import { AREA_LABEL, LIFE_AREAS } from "@/lib/astrology/blend";
import { nearTermWindow } from "@/lib/astrology/dasha";
import type {
  AreaPrediction,
  BlendedVerdict,
  ChartPayload,
  LifeArea,
  PlanetId,
} from "@/lib/astrology/types";
import { DateTime } from "luxon";

const PLANET_PLAIN: Partial<Record<PlanetId, string>> = {
  sun: "visibility and purpose",
  moon: "emotions and daily rhythm",
  mars: "drive and decisive action",
  mercury: "communication and skill",
  jupiter: "growth and opportunity",
  venus: "harmony and affection",
  saturn: "structure and long effort",
  rahu: "ambition and unconventional paths",
  ketu: "detachment and insight",
};

/** Lay-friendly anchors the model (and UI) must lean on for one life area. */
export function buildAreaAnchors(
  chart: ChartPayload,
  area: LifeArea
): string[] {
  const v = chart.verdicts.blended.find((b) => b.lifeArea === area);
  const anchors: string[] = [];
  if (!v) return anchors;

  const houses = v.narrativeBullets
    .filter((b) => b.startsWith("House "))
    .slice(0, 2);
  anchors.push(...houses);

  for (const s of v.strengths.slice(0, 2)) anchors.push(s);
  for (const t of v.tensions.slice(0, 1)) anchors.push(t);

  if (v.mahaLord) {
    anchors.push(
      v.dashaSupports
        ? `Current ${v.mahaLord}${v.antarLord ? `–${v.antarLord}` : ""} dasha activates this area (${v.mahaWindow ?? "current window"}).`
        : `Current ${v.mahaLord}${v.antarLord ? `–${v.antarLord}` : ""} dasha is not the main activator here (${v.mahaWindow ?? "current window"}) — themes build gradually.`
    );
  }

  if (area === "marriage" && chart.vargas?.d9?.ascendant?.sign) {
    anchors.push(
      `Partnership temperament coloured by Navamsa lagna in ${chart.vargas.d9.ascendant.sign}.`
    );
  }
  if (area === "career" && chart.vargas?.d10?.ascendant?.sign) {
    const sunH = chart.vargas.d10.planets.find((p) => p.id === "sun")?.house;
    anchors.push(
      `Vocation style coloured by Dashamsa lagna in ${chart.vargas.d10.ascendant.sign}` +
        (sunH != null ? `; Sun in Dashamsa house ${sunH}` : "") +
        "."
    );
  }

  return Array.from(new Set(anchors)).slice(0, 6);
}

/** Short citations for UI — prefer readable strengths/timing over raw house dumps. */
export function uiCitationsForArea(
  chart: ChartPayload,
  area: LifeArea
): string[] {
  const v = chart.verdicts.blended.find((b) => b.lifeArea === area);
  if (!v) return [];
  const out: string[] = [];
  if (v.strengths[0]) out.push(v.strengths[0]);
  else if (v.narrativeBullets[0]) out.push(v.narrativeBullets[0]);
  if (v.timing) out.push(v.timing);
  else if (v.tensions[0]) out.push(v.tensions[0]);
  return out.slice(0, 2);
}

function buildPredictionFacts(chart: ChartPayload) {
  const asOfDate = chart.asOfDate || DateTime.utc().toISODate()!;
  const window = nearTermWindow(asOfDate);
  const moon = chart.planets.find((p) => p.id === "moon");
  const sun = chart.planets.find((p) => p.id === "sun");

  return {
    asOfDate,
    nearTermWindow: window,
    name: chart.birth.name || "the native",
    tobUnknown: chart.tobUnknown,
    snapshot: {
      ascendant: chart.overview.ascendantSign,
      sun: chart.overview.sunSign,
      sunNakshatra: sun?.nakshatra ?? null,
      moon: chart.overview.moonSign,
      moonNakshatra: moon ? `${moon.nakshatra} pada ${moon.pada}` : null,
      birthPlace: chart.birth.placeLabel,
      dob: chart.birth.dob,
    },
    dashaNow: {
      maha: chart.overview.currentMaha
        ? {
            lord: chart.overview.currentMaha.lord,
            nature: PLANET_PLAIN[chart.overview.currentMaha.lord] ?? "",
            start: chart.overview.currentMaha.start,
            end: chart.overview.currentMaha.end,
          }
        : null,
      antar: chart.overview.currentAntar
        ? {
            lord: chart.overview.currentAntar.lord,
            nature: PLANET_PLAIN[chart.overview.currentAntar.lord] ?? "",
            start: chart.overview.currentAntar.start,
            end: chart.overview.currentAntar.end,
          }
        : null,
      pratyantar: chart.overview.currentPratyantar
        ? {
            lord: chart.overview.currentPratyantar.lord,
            start: chart.overview.currentPratyantar.start,
            end: chart.overview.currentPratyantar.end,
          }
        : null,
    },
    keyPlanets: chart.planets
      .filter((p) =>
        ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"].includes(
          p.id
        )
      )
      .map((p) => ({
        id: p.id,
        sign: p.sign,
        house: p.house ?? null,
        nakshatra: p.nakshatra,
        dignity:
          chart.dignities?.find((d) => d.planet === p.id && d.kind !== "neutral")
            ?.kind ?? null,
        retrograde: Boolean(p.retrograde),
      })),
    presentYogas: chart.yogas
      .filter((y) => y.present)
      .slice(0, 6)
      .map((y) => ({ name: y.name, note: y.detail, tone: y.severity })),
    transitsNow: chart.transits
      ? {
          emphasis: chart.transits.emphasis ?? [],
          hits: chart.transits.hits.slice(0, 4).map((h) => ({
            transit: h.transitPlanet,
            natal: h.natalPlanet,
            orb: h.orb,
          })),
        }
      : null,
    areas: LIFE_AREAS.map((lifeArea) => {
      const v = chart.verdicts.blended.find((b) => b.lifeArea === lifeArea)!;
      return {
        lifeArea,
        label: AREA_LABEL[lifeArea],
        confidence: v.confidence,
        mustCite: buildAreaAnchors(chart, lifeArea),
        strengths: v.strengths.slice(0, 3),
        watch: v.tensions.slice(0, 3),
        dashaSupports: v.dashaSupports,
      };
    }),
  };
}

export async function writePredictions(
  chart: ChartPayload,
  language: "en" | "hi" = "en"
): Promise<NonNullable<ChartPayload["predictionsText"]>> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const asOfDate = chart.asOfDate || DateTime.utc().toISODate()!;
  const window = nearTermWindow(asOfDate);

  if (!apiKey) {
    return fallbackCopy(chart, language);
  }

  const facts = buildPredictionFacts(chart);

  const langRule =
    language === "hi"
      ? "Write the ENTIRE JSON values in natural Hindi (Devanagari). No English paragraphs."
      : "Write the ENTIRE JSON values in warm, precise English.";

  const system = `You write MindKshetra chart readings — personal, specific, and fact-bound.

You receive deterministic FACTS. Every claim about a planet, house, sign, yoga, dasha, or date MUST come from those facts. Never invent placements or years.

${langRule}

READING SHAPE (what “good” means):
- Sound like a careful astrologer talking to one person — not a generic horoscope app.
- Lead with meaning, then prove it with a placement (“because Moon is in … / because Saturn–Mercury dasha is running …”).
- Prefer 1–2 sharp points over a laundry list of houses.
- Ban filler: “changes are coming”, “the stars align”, “interesting period”, “cosmic energy”, “embrace the journey”, “trust the process”.
- Never name school systems (Vedic, KP, Krishnamurti, etc.). One coherent voice.
- No fatalism, no medical diagnoses, no death predictions. Health = vitality/stress patterns only.

DATE RULES:
- Report date is ${asOfDate}. Mention it once in the portrait and when discussing “now”.
- “now” = current maha/antar(/pratyantar) windows in facts.dashaNow only.
- “nearTerm” = ONLY ${window.start} → ${window.end}. Cite that window once per area.
- You may mention transit hits/emphasis from facts.transitsNow; do not invent other transit dates.

PER-AREA RULES:
- Use that area’s mustCite[] — weave at least TWO of those anchors into overview + now (paraphrase OK, do not contradict).
- strengths/watchouts: short bullets, each tied to a placement (not vague advice).
- guidance: one practical paragraph a person could act on this month — not spiritual platitudes.
- If tobUnknown: say Asc/houses are limited; lean on Sun/Moon/nakshatra + Moon dasha.

Return STRICT JSON only:
{
  "portrait": "2 short paragraphs: who this chart feels like (Asc/Sun/Moon + nakshatra if given) + what the current dasha emphasises as of ${asOfDate}",
  "career": Area,
  "marriage": Area,
  "health": Area,
  "finance": Area,
  "education": Area,
  "travel": Area
}

Area =
{
  "headline": "≤10 words, specific to THIS chart (not 'Career Overview')",
  "overview": "1–2 dense paragraphs on how this life area works here — cite placements",
  "strengths": ["3 concrete strengths with placements"],
  "watchouts": ["2 gentle cautions with placements"],
  "now": "1 paragraph: what the CURRENT dasha means for this area (cite lords + dates)",
  "nearTerm": "1 paragraph for ${window.start}→${window.end} only",
  "guidance": "1 practical paragraph"
}`;

  const user = `FACTS (authoritative):\n${JSON.stringify(
    facts,
    null,
    2
  )}\n\nWrite the JSON report now. Make each area feel different — do not repeat the same dasha sentence in every area.`;

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.35,
        max_tokens: 9000,
        response_format: { type: "json_object" },
        reasoning_effort: "none",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        "[astrology] groq write-up failed",
        res.status,
        errText.slice(0, 200)
      );
      return fallbackCopy(chart, language);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = stripThinkBlocks(data.choices?.[0]?.message?.content || "");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const portrait =
      String(parsed.portrait || "").trim() ||
      fallbackPortrait(chart, language);

    const areas = {} as Record<LifeArea, AreaPrediction>;
    for (const area of LIFE_AREAS) {
      areas[area] = normalizeArea(parsed[area], chart, area, language);
    }

    return {
      language,
      portrait,
      areas,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[astrology] prediction write-up error", err);
    return fallbackCopy(chart, language);
  }
}

function normalizeArea(
  raw: unknown,
  chart: ChartPayload,
  area: LifeArea,
  language: "en" | "hi"
): AreaPrediction {
  const fb = fallbackArea(chart, area, language);
  if (!raw || typeof raw !== "object") return fb;
  const r = raw as Record<string, unknown>;
  const strengths = Array.isArray(r.strengths)
    ? r.strengths.map(String).filter(Boolean)
    : fb.strengths;
  const watchouts = Array.isArray(r.watchouts)
    ? r.watchouts.map(String).filter(Boolean)
    : fb.watchouts;
  return {
    headline: String(r.headline || "").trim() || fb.headline,
    overview: String(r.overview || "").trim() || fb.overview,
    strengths: strengths.length ? strengths : fb.strengths,
    watchouts: watchouts.length ? watchouts : fb.watchouts,
    now: String(r.now || "").trim() || fb.now,
    nearTerm: String(r.nearTerm || "").trim() || fb.nearTerm,
    guidance: String(r.guidance || "").trim() || fb.guidance,
  };
}

function fallbackPortrait(
  chart: ChartPayload,
  language: "en" | "hi"
): string {
  const name = chart.birth.name || (language === "hi" ? "जातक" : "This chart");
  const maha = chart.overview.currentMaha;
  const antar = chart.overview.currentAntar;
  const asOf = chart.asOfDate;
  const moon = chart.planets.find((p) => p.id === "moon");
  const yoga = chart.yogas.find((y) => y.present)?.name;

  if (language === "hi") {
    return [
      `${name} का सूर्य ${chart.overview.sunSign} में और चन्द्र ${chart.overview.moonSign} में है${
        moon ? ` (${moon.nakshatra}, पद ${moon.pada})` : ""
      }${
        chart.overview.ascendantSign
          ? `, लग्न ${chart.overview.ascendantSign}`
          : ""
      }।`,
      `${asOf} को महादशा ${maha?.lord ?? "—"} (${maha ? `${maha.start}–${maha.end}` : ""}) और अंतर्दशा ${antar?.lord ?? "—"} चल रही है${
        yoga ? ` — सक्रिय योग: ${yoga}` : ""
      }। नीचे के क्षेत्र इन्हीं संकेतों पर टिके हैं।`,
    ].join("\n\n");
  }

  return [
    `${name} carries Sun in ${chart.overview.sunSign} and Moon in ${chart.overview.moonSign}${
      moon ? ` (${moon.nakshatra}, pada ${moon.pada})` : ""
    }${
      chart.overview.ascendantSign
        ? `, with Ascendant in ${chart.overview.ascendantSign}`
        : ""
    }.`,
    `As of ${asOf}, mahadasha ${maha?.lord ?? "—"} (${maha ? `${maha.start} → ${maha.end}` : "—"}) with antardasha ${antar?.lord ?? "—"} sets the timing${
      yoga ? ` — ${yoga} is also flagged` : ""
    }. The life-area notes below stay tied to those anchors.`,
  ].join("\n\n");
}

function fallbackArea(
  chart: ChartPayload,
  area: LifeArea,
  language: "en" | "hi"
): AreaPrediction {
  const v = chart.verdicts.blended.find((b) => b.lifeArea === area)!;
  const anchors = buildAreaAnchors(chart, area);
  const window = nearTermWindow(chart.asOfDate);
  const label = AREA_LABEL[area];
  const maha = v.mahaLord ?? "—";
  const antar = v.antarLord;

  if (language === "hi") {
    return {
      headline: `${label} — ${v.confidence === "high" ? "स्पष्ट संकेत" : "संतुलित पढ़त"}`,
      overview: [
        anchors.slice(0, 3).join(" "),
        v.dashaSupports
          ? `वर्तमान ${maha}${antar ? `–${antar}` : ""} दशा इस क्षेत्र को सक्रिय कर रही है।`
          : `वर्तमान दशा यहाँ मुख्य सक्रियक नहीं — परिणाम धीरे बनते हैं।`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      strengths: v.strengths.length
        ? v.strengths.slice(0, 3)
        : ["चार्ट में स्थिर आधार संकेत"],
      watchouts: v.tensions.length
        ? v.tensions.slice(0, 2)
        : ["जहाँ देर लगे, धैर्य रखें"],
      now: `${chart.asOfDate}: ${v.timing}`,
      nearTerm: `${window.start} → ${window.end}: ${
        v.dashaSupports
          ? "दशा समर्थन के साथ छोटे ठोस कदम उपयोगी।"
          : "बड़े निर्णयों से पहले आधार मजबूत करें।"
      }`,
      guidance:
        "एक स्पष्ट अगला कदम चुनें — साप्ताहिक समीक्षा करें; बड़े बदलाव दशा खिड़की से मिलाकर तय करें।",
    };
  }

  const overviewParts = [
    anchors[0]
      ? `In this chart, ${label} reads through ${anchors[0].replace(/^House/, "house")}.`
      : `In this chart, ${label} is read from its focus houses and lords.`,
    anchors[1] ? anchors[1] : null,
    v.dashaSupports
      ? `Because ${maha}${antar ? `–${antar}` : ""} is running (${v.mahaWindow ?? "current window"}), nearer-term movement here is more available.`
      : `The running ${maha}${antar ? `–${antar}` : ""} dasha is not the main activator here, so results tend to build patiently through ${v.mahaWindow ?? "this period"}.`,
  ].filter(Boolean) as string[];

  return {
    headline:
      v.confidence === "high"
        ? `${capitalize(areaFocus(area))}: clear chart support`
        : `${capitalize(areaFocus(area))}: paced development`,
    overview: overviewParts.join("\n\n"),
    strengths: v.strengths.length
      ? v.strengths.slice(0, 3)
      : [
          `Focus houses for ${label} carry workable signatures in this chart.`,
        ],
    watchouts: v.tensions.length
      ? v.tensions.slice(0, 2)
      : ["Where effort meets delay, prefer steady routines over forced breakthroughs."],
    now: `As of ${chart.asOfDate}: ${v.timing}`,
    nearTerm: `From ${window.start} to ${window.end}, ${
      v.dashaSupports
        ? "use the active dasha window for concrete next steps rather than waiting for a perfect opening."
        : "strengthen foundations; save irreversible moves for clearer activation."
    }`,
    guidance: `Pick one measurable action in ${areaFocus(area)} this month, review it weekly, and weigh larger decisions against the ${maha}${antar ? `–${antar}` : ""} dasha window.`,
  };
}

function areaFocus(area: LifeArea): string {
  switch (area) {
    case "career":
      return "work and vocation";
    case "marriage":
      return "relationships";
    case "health":
      return "vitality";
    case "finance":
      return "money and resources";
    case "education":
      return "learning";
    case "travel":
      return "movement and travel";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fallbackCopy(
  chart: ChartPayload,
  language: "en" | "hi"
): NonNullable<ChartPayload["predictionsText"]> {
  const areas = {} as Record<LifeArea, AreaPrediction>;
  for (const area of LIFE_AREAS) {
    areas[area] = fallbackArea(chart, area, language);
  }
  return {
    language,
    portrait: fallbackPortrait(chart, language),
    areas,
    generatedAt: new Date().toISOString(),
  };
}

export function buildAstrologyChatSystemPrompt(
  chart: ChartPayload,
  language: "en" | "hi",
  chartContext: string
): string {
  const langBlock =
    language === "hi"
      ? `LANGUAGE: Reply entirely in natural Hindi (Devanagari).`
      : `LANGUAGE: Reply in warm, clear English.`;

  const featured = [...chart.verdicts.blended].sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[b.confidence] - rank[a.confidence];
  })[0];

  return `You are MindKshetra’s chart guide — a careful astrologer answering ONLY about this birth chart.

${langBlock}

ANSWER SHAPE (follow every time):
1. Direct answer in 1–2 sentences.
2. Proof: at least one explicit citation — “because [planet] in [house/sign]…” or “because [dasha lord] is running (dates)…”.
3. Practical note: one grounded next step or nuance (optional second citation).
4. Keep to ~2–4 short paragraphs unless they ask for more depth.

RULES:
- Use ONLY the chart facts below. Never invent planets, houses, degrees, yogas, or dasha dates.
- Report date is ${chart.asOfDate}. Do not invent other year phrases.
- Never name competing schools (Vedic/KP/etc.).
- Ban filler (“the stars say”, “cosmic energy”, “trust the journey”).
- Health: soft vitality language only; no diagnosis; suggest professional care when relevant.
- No death predictions or catastrophic claims.
- If the question is off-chart, briefly decline and steer back.

${
  featured
    ? `Strongest life-area signal right now: ${featured.lifeArea} (${featured.confidence}). Timing note: ${featured.timing}`
    : ""
}

CHART FACTS:
${chartContext}

${
  chart.predictionsText
    ? `PRIOR READING (paraphrase OK, do not contradict):\n${chart.predictionsText.portrait.slice(0, 900)}\n\nFeatured snippets:\n${LIFE_AREAS.slice(
        0,
        3
      )
        .map((a) => {
          const row = chart.predictionsText!.areas[a];
          return `- ${a}: ${row.headline} — ${row.now.slice(0, 180)}`;
        })
        .join("\n")}`
    : ""
}`;
}

/** @deprecated prefer uiCitationsForArea — kept for any external callers */
export function areaCitationsFromVerdict(b: BlendedVerdict | undefined): string[] {
  if (!b) return [];
  return [...b.strengths, b.timing].filter(Boolean).slice(0, 2);
}
