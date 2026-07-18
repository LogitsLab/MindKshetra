import type { Mood } from "@/lib/types";

export const moods: Mood[] = [
  { id: "anxious", label: "Anxious", labelHi: "चिंतित", tags: ["anxiety_fear", "overwhelm_burnout", "control_of_mind"] },
  { id: "sad", label: "Sad", labelHi: "उदास", tags: ["grief_loss", "loneliness", "gratitude_contentment"] },
  { id: "angry", label: "Angry", labelHi: "क्रोधित", tags: ["anger", "control_of_mind", "relationships_conflict"] },
  { id: "confused", label: "Confused", labelHi: "उलझन में", tags: ["confusion_decision", "purpose_meaning", "duty_responsibility"] },
  { id: "grieving", label: "Grieving", labelHi: "शोक में", tags: ["grief_loss", "impermanence_mortality", "equanimity"] },
  { id: "lonely", label: "Lonely", labelHi: "अकेला", tags: ["loneliness", "devotion_surrender", "purpose_meaning"] },
  { id: "overwhelmed", label: "Overwhelmed", labelHi: "अभिभूत", tags: ["overwhelm_burnout", "action_without_attachment", "equanimity"] },
  { id: "guilty", label: "Guilty", labelHi: "दोषी", tags: ["guilt", "duty_responsibility", "action_without_attachment"] },
  { id: "jealous", label: "Jealous", labelHi: "ईर्ष्यालु", tags: ["jealousy_comparison", "ego_pride", "detachment"] },
  { id: "unmotivated", label: "Unmotivated", labelHi: "निष्क्रिय", tags: ["unmotivated", "courage", "duty_responsibility", "low_self_worth"] },
  { id: "fearful", label: "Fearful", labelHi: "भयभीत", tags: ["anxiety_fear", "courage", "hope"] },
  { id: "hopeful", label: "Hopeful", labelHi: "आशावान", tags: ["hope", "gratitude_contentment", "purpose_meaning"] },
  { id: "grateful", label: "Grateful", labelHi: "कृतज्ञ", tags: ["gratitude_contentment", "devotion_surrender", "equanimity"] },
  { id: "big-decision", label: "Facing a big decision", labelHi: "बड़े निर्णय पर", tags: ["confusion_decision", "duty_responsibility", "courage"] },
  { id: "conflict", label: "Going through conflict", labelHi: "संघर्ष में", tags: ["relationships_conflict", "anger", "equanimity"] },
  { id: "failure", label: "Feeling like a failure", labelHi: "असफलता का भाव", tags: ["low_self_worth", "courage", "action_without_attachment"] },
  { id: "purpose", label: "Searching for purpose", labelHi: "उद्देश्य खोजते", tags: ["purpose_meaning", "duty_responsibility", "devotion_surrender"] },
  { id: "happy", label: "Happy", labelHi: "प्रसन्न", tags: ["gratitude_contentment", "equanimity", "detachment"] },
];

export function getAllMoods(): Mood[] {
  return moods;
}

export function getMoodById(id: string): Mood | undefined {
  return moods.find((m) => m.id === id);
}

export function moodLabel(mood: Mood, lang: "en" | "hi"): string {
  return lang === "hi" ? mood.labelHi : mood.label;
}
