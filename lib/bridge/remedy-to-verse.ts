/**
 * ceo/T9 — pair a Lal Kitab remedy with the verse that teaches the same
 * discipline.
 *
 *   remedy text ──▶ discipline ──▶ verse tag ──▶ retrieveSlokas(extraTags)
 *   "feed the birds"     service      duty_responsibility
 *   "avoid anger"        restraint    anger, control_of_mind
 *
 * Why this exists: lib/astrology/lalkitab.ts computes 238 lines of traditional
 * remedies that currently sit entirely disconnected from the product's stated
 * purpose. A remedy on its own is an instruction — "wear this, avoid that". A
 * remedy beside the verse that teaches the same underlying discipline is a
 * practice with a reason, which is the whole integration thesis in one screen.
 *
 * DELIBERATELY NOT a causal claim. The pairing says "this teaching speaks to the
 * same discipline", never "do this because the Gita says so". Traditional
 * remedies carry enough implied-efficacy weight already; scripture should not be
 * conscripted to underwrite them.
 *
 * Keyword matching rather than an LLM call on purpose: the mapping must be
 * inspectable and stable. A model deciding which verse justifies which remedy is
 * exactly the kind of unfalsifiable pairing the review kept cutting elsewhere.
 */

export type RemedyDiscipline =
  | "service"
  | "restraint"
  | "detachment"
  | "discipline"
  | "devotion"
  | "courage";

/** Every tag verified present in data/slokas.json's 26-tag vocabulary. */
export const DISCIPLINE_TAGS: Record<RemedyDiscipline, string[]> = {
  service: ["duty_responsibility", "action_without_attachment"],
  restraint: ["anger", "control_of_mind", "equanimity"],
  detachment: ["detachment", "attachment_desire"],
  discipline: ["discipline_habit", "control_of_mind"],
  devotion: ["devotion_surrender", "gratitude_contentment"],
  courage: ["courage", "low_self_worth"],
};

export const DISCIPLINE_LABEL: Record<RemedyDiscipline, { en: string; hi: string }> = {
  service: { en: "service without expectation", hi: "निष्काम सेवा" },
  restraint: { en: "restraint", hi: "संयम" },
  detachment: { en: "letting go", hi: "अनासक्ति" },
  discipline: { en: "steady practice", hi: "नियमित अभ्यास" },
  devotion: { en: "devotion", hi: "भक्ति" },
  courage: { en: "courage", hi: "साहस" },
};

const MATCHERS: Array<{ discipline: RemedyDiscipline; re: RegExp }> = [
  {
    discipline: "service",
    re: /\b(feed|donate|give|charity|serve|offer|help|alms|daan|food)\b/i,
  },
  {
    discipline: "restraint",
    re: /\b(avoid|abstain|refrain|do not|never|anger|temper|speech|silence|quarrel)\b/i,
  },
  {
    discipline: "detachment",
    re: /\b(flow(ing)? water|river|release|let go|discard|throw|immerse|part with)\b/i,
  },
  {
    discipline: "discipline",
    re: /\b(daily|every (day|morning)|regular|routine|sunrise|before dawn|fast(ing)?|practice)\b/i,
  },
  {
    discipline: "devotion",
    re: /\b(worship|pray|temple|recite|chant|mantra|deity|lamp|diya|offering)\b/i,
  },
  {
    discipline: "courage",
    re: /\b(face|confront|stand|speak up|responsibility|accept)\b/i,
  },
];

export type RemedyPairing = {
  discipline: RemedyDiscipline;
  /** Tags to pass to retrieveSlokas as extraTags. */
  tags: string[];
  label: { en: string; hi: string };
};

/**
 * Classifies a remedy into a discipline.
 *
 * Returns null when nothing matches, and callers must render the remedy alone in
 * that case. Forcing a pairing would produce exactly the arbitrary
 * verse-next-to-instruction juxtaposition this is meant to avoid.
 */
export function pairRemedy(remedyText: string): RemedyPairing | null {
  if (!remedyText || !remedyText.trim()) return null;
  for (const { discipline, re } of MATCHERS) {
    if (re.test(remedyText)) {
      return {
        discipline,
        tags: DISCIPLINE_TAGS[discipline],
        label: DISCIPLINE_LABEL[discipline],
      };
    }
  }
  return null;
}

/** Phrasing for the UI. States kinship, never causation. */
export function pairingCaption(
  pairing: RemedyPairing,
  lang: "en" | "hi"
): string {
  return lang === "hi"
    ? `यही अनुशासन — ${pairing.label.hi} — गीता में भी सिखाया गया है`
    : `The same discipline — ${pairing.label.en} — is taught here`;
}
