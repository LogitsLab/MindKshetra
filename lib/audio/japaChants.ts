/**
 * Catalog mantras that ship a pre-recorded human recitation.
 * Never TTS — missing id (custom naam, or no CC clip yet) stays silent.
 *
 * Sources (served from /audio/japa/{id}.m4a):
 * - om — Tito Dutta, Wikimedia Commons, CC BY-SA 3.0 (File:Om pro.ogg)
 * - om-namo-bhagavate-vasudevaya — Tito Dutta, CC BY-SA 3.0
 * - hare-krishna — Lalanesha Dasa Prabhu, Jamendo / IA jamendo-151553,
 *   CC BY-SA 3.0 (one cycle trimmed from "Maha Mantra Hare Krishna")
 * - so-ham — Gedney2001, Wikimedia Commons, CC0 (File:Soham.oga)
 * - om-namah-shivaya — शिव साहिल, CC BY-SA 4.0
 * - gayatri — Rameshvar, CC0 (Wikipedia Gayatri Mantra wav)
 * - mahamrityunjaya — Rameshvar, Free Art License (File:Mrityunjaya.ogg)
 */
export const JAPA_CHANT_IDS = [
  "om",
  "om-namo-bhagavate-vasudevaya",
  "hare-krishna",
  "so-ham",
  "om-namah-shivaya",
  "gayatri",
  "mahamrityunjaya",
] as const;

export type JapaChantId = (typeof JAPA_CHANT_IDS)[number];

export function hasJapaChant(id: string): id is JapaChantId {
  return (JAPA_CHANT_IDS as readonly string[]).includes(id);
}
