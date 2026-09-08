import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyChartClaims, verificationSummary } from "@/lib/bridge/chart-verify";
import type { ChartPayload } from "@/lib/astrology/types";

/**
 * eng/E6 — the reading voice is the only half of the reply that can be checked,
 * because every claim it makes is about a chart we computed and still hold.
 *
 * The verifier is deliberately conservative: a false positive deletes a TRUE
 * sentence from someone's reading, which is worse than letting an unusual
 * phrasing through.
 */
const chart = {
  asOfDate: "2026-07-26",
  planets: [
    { id: "saturn", sign: "capricorn", house: 10 },
    { id: "mars", sign: "leo", house: 5 },
    { id: "moon", sign: "cancer" }, // no house — birth time unknown
  ],
  overview: {
    currentMaha: { lord: "saturn" },
    currentAntar: { lord: "mercury" },
  },
} as unknown as ChartPayload;

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("chart claim verification", () => {
  it("accepts a true house claim", () => {
    const r = verifyChartClaims("Saturn holds your tenth house.", chart);
    expect(r.violations).toHaveLength(1 - 1);
    expect(r.text).toContain("Saturn");
  });

  it("catches a false house claim and drops the sentence", () => {
    const r = verifyChartClaims("Saturn holds your sixth house.", chart);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]).toMatchObject({
      kind: "house",
      planet: "saturn",
      claimed: "6",
      actual: "10",
    });
    expect(r.text).toBe("");
  });

  it("accepts a true sign claim", () => {
    expect(verifyChartClaims("Mars sits in Leo.", chart).violations).toHaveLength(0);
  });

  it("catches a false sign claim", () => {
    const r = verifyChartClaims("Mars sits in Pisces.", chart);
    expect(r.violations[0]).toMatchObject({ kind: "sign", actual: "leo" });
  });

  it("accepts a real current dasha lord", () => {
    expect(
      verifyChartClaims("Your Saturn period runs for some time yet.", chart)
        .violations
    ).toHaveLength(0);
  });

  it("catches a planet claimed as the CURRENTLY running dasha lord when it is not", () => {
    // Present-tense assertion ("currently running") + a non-current lord (Venus)
    // is a checkable, false claim, so it is still dropped. (BUG A fix — a present
    // cue is required to make the dasha mention a "current lord" claim.)
    const r = verifyChartClaims(
      "You are currently running your Venus dasha.",
      chart
    );
    expect(r.violations[0]).toMatchObject({ kind: "dasha", planet: "venus" });
    expect(r.text).toBe("");
  });

  // BUG A fix (a) — the prompt explicitly asks the model to preview upcoming and
  // recap past dasha windows, so a future/past dasha sentence about a planet that
  // is not a current lord is legitimate and must be KEPT, not stripped.
  it("keeps a FUTURE dasha window claim about a non-current lord", () => {
    const text = "Your upcoming Venus dasha will bring change.";
    const r = verifyChartClaims(text, chart);
    expect(r.violations).toHaveLength(0);
    expect(r.text).toBe(text);
  });

  it("keeps a PAST dasha window claim about a non-current lord", () => {
    const text = "Your earlier Sun dasha shaped these years.";
    const r = verifyChartClaims(text, chart);
    expect(r.violations).toHaveLength(0);
    expect(r.text).toBe(text);
  });

  // BUG B fix (c) — a sentence naming more than one planet cannot be
  // unambiguously attributed to a single subject by the single-planet extractor,
  // so the verifier now SKIPS it: no claims are produced and the sentence is
  // kept, rather than being mis-verified as if it were only about the first
  // planet. Chosen as the conservative option (never delete on a wrong
  // attribution) over iterating and risking false positives.
  it("skips (does not verify) a sentence naming more than one planet", () => {
    // "Mars and Venus sit in Leo" — Mars IS in Leo (true) but Venus is not, and
    // the old code checked only Mars, silently passing the false Venus half.
    // Now the whole sentence is skipped rather than mis-attributed.
    const text = "Mars and Venus sit in Leo.";
    const r = verifyChartClaims(text, chart);
    expect(r.claims).toHaveLength(0);
    expect(r.violations).toHaveLength(0);
    expect(r.text).toBe(text);
  });

  it("still verifies single-planet sentences around a skipped multi-planet one", () => {
    // The multi-planet sentence is skipped; the neighbouring single-planet false
    // claim is still caught and dropped.
    const r = verifyChartClaims(
      "Mars and Venus sit in Leo. Saturn holds your sixth house.",
      chart
    );
    expect(r.text).toContain("Mars and Venus");
    expect(r.text).not.toContain("sixth house");
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]).toMatchObject({ kind: "house", planet: "saturn" });
  });

  // Unknown is not false. Birth-time-unknown charts have no houses, and we
  // cannot disprove a house claim we never computed.
  it("does not flag a house claim when the chart has no house for that planet", () => {
    expect(
      verifyChartClaims("The Moon occupies your fourth house.", chart).violations
    ).toHaveLength(0);
  });

  it("keeps true sentences and drops only the false one", () => {
    const r = verifyChartClaims(
      "Saturn holds your tenth house. Mars sits in Pisces. Endurance is asked of you.",
      chart
    );
    expect(r.text).toContain("tenth house");
    expect(r.text).toContain("Endurance");
    expect(r.text).not.toContain("Pisces");
  });

  it("can report without stripping", () => {
    const r = verifyChartClaims("Saturn holds your sixth house.", chart, false);
    expect(r.violations).toHaveLength(1);
    expect(r.text).toBe("Saturn holds your sixth house.");
  });

  it("ignores sentences with no planet in them", () => {
    const text = "This period asks for patience rather than speed.";
    const r = verifyChartClaims(text, chart);
    expect(r.claims).toHaveLength(0);
    expect(r.text).toBe(text);
  });

  it("logs every dropped claim so the rate is observable", () => {
    verifyChartClaims("Saturn holds your sixth house.", chart);
    expect(warn).toHaveBeenCalled();
  });

  it("summarises for contribution logging", () => {
    const r = verifyChartClaims(
      "Saturn holds your tenth house. Mars sits in Pisces.",
      chart
    );
    expect(verificationSummary(r)).toBe("1/2 claims verified");
  });

  it("says so when nothing was checkable", () => {
    expect(
      verificationSummary(verifyChartClaims("Be patient today.", chart))
    ).toBe("no checkable claims");
  });

  it("handles Devanagari sentence endings without mangling the text", () => {
    const r = verifyChartClaims("धैर्य रखें। शनि दसवें भाव में है।", chart);
    expect(r.text.length).toBeGreaterThan(0);
  });
});
