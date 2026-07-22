import {
  GROQ_CHAT_URL,
  GROQ_MODEL,
  stripThinkBlocks,
} from "@/lib/groq";
import { AREA_LABEL, LIFE_AREAS } from "@/lib/astrology/blend";
import { nearTermWindow } from "@/lib/astrology/dasha";
import type {
  AreaPrediction,
  ChartPayload,
  LifeArea,
} from "@/lib/astrology/types";
import { DateTime } from "luxon";

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

  const facts = {
    asOfDate,
    nearTermWindow: window,
    name: chart.birth.name || "the native",
    tobUnknown: chart.tobUnknown,
    birth: {
      dob: chart.birth.dob,
      tob: chart.birth.tob,
      place: chart.birth.placeLabel,
      tz: chart.birth.ianaTz,
    },
    luminaries: {
      sun: chart.overview.sunSign,
      moon: chart.overview.moonSign,
      ascendant: chart.overview.ascendantSign,
    },
    dasha: {
      maha: chart.overview.currentMaha
        ? {
            lord: chart.overview.currentMaha.lord,
            start: chart.overview.currentMaha.start,
            end: chart.overview.currentMaha.end,
          }
        : null,
      antar: chart.overview.currentAntar
        ? {
            lord: chart.overview.currentAntar.lord,
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
    planets: chart.planets.map((p) => ({
      id: p.id,
      sign: p.sign,
      degree: Number(p.degreeInSign.toFixed(2)),
      nakshatra: p.nakshatra,
      pada: p.pada,
      house: p.house ?? null,
      retrograde: Boolean(p.retrograde),
    })),
    yogas: chart.yogas.filter((y) => y.present).map((y) => ({
      name: y.name,
      detail: y.detail,
      severity: y.severity,
    })),
    areas: chart.verdicts.blended.map((b) => ({
      lifeArea: b.lifeArea,
      label: AREA_LABEL[b.lifeArea],
      confidence: b.confidence,
      theme: b.theme,
      timing: b.timing,
      strengths: b.strengths,
      tensions: b.tensions,
      bullets: b.narrativeBullets,
      dashaSupports: b.dashaSupports,
      mahaLord: b.mahaLord,
      antarLord: b.antarLord,
      mahaWindow: b.mahaWindow,
      antarWindow: b.antarWindow,
    })),
  };

  const langRule =
    language === "hi"
      ? "Write the ENTIRE output in natural Hindi using Devanagari. No English paragraphs."
      : "Write the ENTIRE output in warm, precise English.";

  const system = `You are a senior chart interpreter writing a detailed personal astrology report.
You receive deterministic chart FACTS only. Your job is prose — never invent placements, dates, houses, yogas, or dasha periods.

DATE RULES (mandatory):
- Today / report date is facts.asOfDate (${asOfDate}). Anchor every "now" and "near term" statement to this date.
- Do NOT invent vague year phrases like "early 2026" or "late 2025" unless those exact months fall inside the provided dasha start/end or nearTermWindow.
- "now" = the CURRENT mahadasha/antardasha/pratyantar using the given start/end dates, as of asOfDate.
- "nearTerm" = ONLY the window facts.nearTermWindow.start → facts.nearTermWindow.end (asOfDate through +12 months). Cite that window explicitly once.

Voice:
- Specific and concrete, not vague horoscope filler ("changes are coming").
- Warm, steady, non-alarmist. No fatalism. No medical diagnoses. No death predictions.
- Never name competing systems (do not say Vedic, KP, Krishnamurti, etc.). One coherent voice.
- Reference the actual planets, houses, signs, nakshatras, and dasha windows from the facts.
- ${langRule}

Return STRICT JSON:
{
  "portrait": "2–3 paragraph overall life portrait weaving Asc/Sun/Moon + current dasha + strongest patterns; mention asOfDate once",
  "career": { ...Area },
  "marriage": { ...Area },
  "health": { ...Area },
  "finance": { ...Area },
  "education": { ...Area },
  "travel": { ...Area }
}

Each Area object MUST have:
{
  "headline": "short punchy title (max ~12 words)",
  "overview": "2–3 dense paragraphs on how this area works in the chart",
  "strengths": ["3–5 concrete strengths tied to placements"],
  "watchouts": ["2–4 gentle cautions tied to placements — never catastrophic"],
  "now": "1–2 paragraphs on the CURRENT dasha period for this area (use the given start/end dates and asOfDate)",
  "nearTerm": "1–2 paragraphs covering ONLY nearTermWindow",
  "guidance": "1 paragraph of practical, grounded suggestions"
}

Health area: frame as vitality/stress patterns only; urge professional care for medical concerns.
If tobUnknown is true: openly say house/Asc timing is limited; lean on luminaries + Moon dasha themes.`;

  const user = `Chart facts (authoritative — do not contradict):\n${JSON.stringify(
    facts,
    null,
    2
  )}\n\nWrite the full JSON report now.`;

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.55,
        max_tokens: 8000,
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
  const maha = chart.overview.currentMaha?.lord ?? "—";
  const antar = chart.overview.currentAntar?.lord ?? "—";
  const asOf = chart.asOfDate;
  if (language === "hi") {
    return `${name} का सूर्य ${chart.overview.sunSign} में और चन्द्र ${chart.overview.moonSign} में है${
      chart.overview.ascendantSign
        ? `, लग्न ${chart.overview.ascendantSign}`
        : ""
    }। ${asOf} को वर्तमान महादशा ${maha} और अंतर्दशा ${antar} है।`;
  }
  return `${name} has Sun in ${chart.overview.sunSign} and Moon in ${chart.overview.moonSign}${
    chart.overview.ascendantSign
      ? `, with Ascendant in ${chart.overview.ascendantSign}`
      : ""
  }. As of ${asOf}, the current mahadasha is ${maha} with antardasha ${antar}.`;
}

function fallbackArea(
  chart: ChartPayload,
  area: LifeArea,
  language: "en" | "hi"
): AreaPrediction {
  const v = chart.verdicts.blended.find((b) => b.lifeArea === area)!;
  const label = AREA_LABEL[area];
  const window = nearTermWindow(chart.asOfDate);
  if (language === "hi") {
    return {
      headline: label,
      overview: `${v.theme} ${v.timing}`,
      strengths: v.strengths.length ? v.strengths : ["चार्ट में स्थिर संकेत"],
      watchouts: v.tensions.length
        ? v.tensions
        : ["धैर्य और स्पष्टता बनाए रखें"],
      now: `${chart.asOfDate} को: ${v.timing}`,
      nearTerm: `${window.start} से ${window.end}: ${v.timing}`,
      guidance:
        "व्यावहारिक कदम छोटे रखें; बड़े निर्णयों से पहले दशा काल को ध्यान में रखें।",
    };
  }
  return {
    headline: `How ${label} shows in this chart`,
    overview: `${v.theme}\n\n${v.narrativeBullets.join(" ")}`,
    strengths: v.strengths.length
      ? v.strengths
      : ["Steady chart signatures support gradual progress."],
    watchouts: v.tensions.length
      ? v.tensions
      : ["Stay patient where results need time."],
    now: `As of ${chart.asOfDate}: ${v.timing}`,
    nearTerm: `${window.start} → ${window.end}: ${v.timing}`,
    guidance:
      "Take practical steps in small increments; weigh major decisions against the current dasha window.",
  };
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

  return `You are the chart guide for MindKshetra — a careful astrologer-companion answering questions ONLY about this person's birth chart.

${langBlock}

Rules:
- Use ONLY the chart facts below. Do not invent planets, houses, degrees, yogas, or dasha dates.
- Report date / today is ${chart.asOfDate}. Do not invent other year phrases.
- Never mention competing school names (Vedic/KP/etc.). Speak as one coherent reading.
- If asked something unrelated to this chart, briefly decline and steer back to the chart.
- Health: soft language only; no diagnosis; suggest professional care when appropriate.
- No death predictions or catastrophic claims.
- Be detailed and specific: cite placements when explaining.
- Keep replies focused (roughly 2–5 short paragraphs unless they ask for more).

CHART FACTS:
${chartContext}

${
  chart.predictionsText
    ? `PRIOR WRITTEN SUMMARY (may paraphrase, do not contradict):\nPortrait: ${chart.predictionsText.portrait.slice(0, 1200)}`
    : ""
}`;
}
