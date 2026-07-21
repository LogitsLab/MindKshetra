import type { Mood } from "@/lib/types";

export { moods } from "@/lib/moods-data";

export function moodLabel(mood: Mood, lang: "en" | "hi"): string {
  return lang === "hi" ? mood.labelHi : mood.label;
}
