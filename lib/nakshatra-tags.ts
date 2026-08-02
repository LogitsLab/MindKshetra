import { NAKSHATRAS } from "@/lib/astrology/signs";

/**
 * Today's Moon nakshatra → verse-tag pools for the Verse of the Day
 * (plan Phase 1). Values must come from the 26-tag vocabulary seeded in
 * migration 001 (see data/slokas.json); each pair keeps the pool large
 * (tags OR together), so repeats stay rare even when a nakshatra recurs
 * (~monthly).
 *
 * The associations follow each nakshatra's classical signification —
 * e.g. Ardra (the storm) sits with grief and impermanence, Swati (the
 * independent wind) with detachment and equanimity. They are editorial,
 * reviewable, and deliberately static: the ephemeris decides the day,
 * this table decides the theme, and no LLM is involved.
 */
export const NAKSHATRA_TAGS: Record<(typeof NAKSHATRAS)[number], string[]> = {
  Ashwini: ["courage", "hope"],
  Bharani: ["discipline_habit", "impermanence_mortality"],
  Krittika: ["courage", "discipline_habit"],
  Rohini: ["gratitude_contentment", "attachment_desire"],
  Mrigashira: ["purpose_meaning", "confusion_decision"],
  Ardra: ["grief_loss", "impermanence_mortality"],
  Punarvasu: ["hope", "equanimity"],
  Pushya: ["devotion_surrender", "gratitude_contentment"],
  Ashlesha: ["attachment_desire", "control_of_mind"],
  Magha: ["duty_responsibility", "ego_pride"],
  "Purva Phalguni": ["gratitude_contentment", "success_ambition"],
  "Uttara Phalguni": ["duty_responsibility", "relationships_conflict"],
  Hasta: ["action_without_attachment", "discipline_habit"],
  Chitra: ["success_ambition", "ego_pride"],
  Swati: ["detachment", "equanimity"],
  Vishakha: ["success_ambition", "purpose_meaning"],
  Anuradha: ["devotion_surrender", "loneliness"],
  Jyeshtha: ["ego_pride", "jealousy_comparison"],
  Mula: ["detachment", "impermanence_mortality"],
  "Purva Ashadha": ["courage", "success_ambition"],
  "Uttara Ashadha": ["duty_responsibility", "purpose_meaning"],
  Shravana: ["control_of_mind", "devotion_surrender"],
  Dhanishta: ["success_ambition", "gratitude_contentment"],
  Shatabhisha: ["loneliness", "equanimity"],
  "Purva Bhadrapada": ["anxiety_fear", "discipline_habit"],
  "Uttara Bhadrapada": ["equanimity", "control_of_mind"],
  Revati: ["hope", "devotion_surrender"],
};
