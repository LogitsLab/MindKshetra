import type { ChartPayload, PlanetId } from "@/lib/astrology/types";

/**
 * eng/E6 — verify the chart voice against ground truth.
 *
 * The teaching voice cannot be checked: "duty that feels heavy is still duty" is
 * not falsifiable. The READING voice can, because every claim it makes is about
 * a chart we computed and still hold in memory. So the half of the reply that is
 * checkable is the half that was previously enforced only by a line in a prompt
 * saying "never invent planets, houses, degrees, yogas or dasha dates".
 *
 *   "Saturn holds your tenth house"  ──▶  chart.planets.find(saturn).house === 10 ?
 *   "your Jupiter period"            ──▶  is Jupiter actually a current dasha lord?
 *   "Mars in Leo"                    ──▶  chart.planets.find(mars).sign === "leo" ?
 *
 * Deliberately CONSERVATIVE. A false positive here deletes a true sentence from
 * a user's reading, which is worse than letting an unusual phrasing through. So
 * it only flags a claim when it can positively identify both the subject and the
 * assertion, and stays silent on anything ambiguous.
 */

const PLANET_WORDS: Record<string, PlanetId> = {
  sun: "sun",
  moon: "moon",
  mars: "mars",
  mercury: "mercury",
  jupiter: "jupiter",
  venus: "venus",
  saturn: "saturn",
  rahu: "rahu",
  ketu: "ketu",
};

const ORDINAL_HOUSE: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6,
  "7th": 7, "8th": 8, "9th": 9, "10th": 10, "11th": 11, "12th": 12,
};

export type ChartClaim = {
  kind: "house" | "sign" | "dasha";
  planet: PlanetId;
  claimed: string;
  actual: string | null;
  ok: boolean;
  sentence: string;
};

export type VerifyResult = {
  claims: ChartClaim[];
  violations: ChartClaim[];
  /** Text with unverifiable sentences removed. Equals input when all claims hold. */
  text: string;
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function planetIn(sentence: string): PlanetId | null {
  const lower = sentence.toLowerCase();
  for (const [word, id] of Object.entries(PLANET_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return id;
  }
  return null;
}

function houseIn(sentence: string): number | null {
  const lower = sentence.toLowerCase();
  for (const [word, n] of Object.entries(ORDINAL_HOUSE)) {
    if (new RegExp(`\\b${word}\\s+house\\b`).test(lower)) return n;
  }
  const m = lower.match(/\bhouse\s+(\d{1,2})\b/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return n;
  }
  return null;
}

function signIn(sentence: string, signs: string[]): string | null {
  const lower = sentence.toLowerCase();
  for (const s of signs) {
    if (new RegExp(`\\b${s}\\b`).test(lower)) return s;
  }
  return null;
}

function currentDashaLords(chart: ChartPayload): Set<string> {
  const out = new Set<string>();
  const ov = chart.overview as unknown as Record<string, { lord?: string } | null>;
  for (const key of ["currentMaha", "currentAntar", "currentPratyantar"]) {
    const lord = ov?.[key]?.lord;
    if (lord) out.add(String(lord).toLowerCase());
  }
  return out;
}

/**
 * @param strip when true, sentences containing a violated claim are removed.
 *   Dropping the sentence is preferred over annotating it: an inline correction
 *   ("actually Saturn is in your 6th") makes the product argue with itself in
 *   front of the user.
 */
export function verifyChartClaims(
  text: string,
  chart: ChartPayload,
  strip = true
): VerifyResult {
  const claims: ChartClaim[] = [];
  const signs = Array.from(
    new Set(chart.planets.map((p) => String(p.sign).toLowerCase()))
  );
  const allSigns = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
  ];
  const dashaLords = currentDashaLords(chart);

  for (const sentence of splitSentences(text)) {
    const planet = planetIn(sentence);
    if (!planet) continue;
    const pos = chart.planets.find((p) => p.id === planet);

    const house = houseIn(sentence);
    if (house !== null) {
      const actual = pos?.house ?? null;
      claims.push({
        kind: "house",
        planet,
        claimed: String(house),
        actual: actual === null ? null : String(actual),
        // Unknown house (no birth time) is NOT a violation — we cannot disprove it.
        ok: actual === null ? true : actual === house,
        sentence,
      });
    }

    const sign = signIn(sentence, allSigns);
    if (sign !== null) {
      const actual = pos ? String(pos.sign).toLowerCase() : null;
      claims.push({
        kind: "sign",
        planet,
        claimed: sign,
        actual,
        ok: actual === null ? true : actual === sign,
        sentence,
      });
    }

    if (/\b(dasha|period|mahadasha|antardasha)\b/i.test(sentence)) {
      const isCurrent = dashaLords.has(planet);
      claims.push({
        kind: "dasha",
        planet,
        claimed: "current dasha lord",
        actual: Array.from(dashaLords).join(",") || null,
        // Only flag when we positively know the lords and this planet is absent.
        ok: dashaLords.size === 0 ? true : isCurrent,
        sentence,
      });
    }
  }

  const violations = claims.filter((c) => !c.ok);

  let out = text;
  if (strip && violations.length > 0) {
    const bad = new Set(violations.map((v) => v.sentence));
    out = splitSentences(text)
      .filter((s) => !bad.has(s))
      .join(" ")
      .trim();
    for (const v of violations) {
      console.warn(
        `[chart-verify] dropped an unverifiable ${v.kind} claim: ` +
          `${v.planet} claimed ${v.claimed}, chart says ${v.actual ?? "unknown"}`
      );
    }
  }

  return { claims, violations, text: out };
}

/** Signal for TODOS G3 — how often the chart voice makes checkable claims. */
export function verificationSummary(r: VerifyResult): string {
  if (r.claims.length === 0) return "no checkable claims";
  return `${r.claims.length - r.violations.length}/${r.claims.length} claims verified`;
}
