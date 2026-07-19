import type { Mood } from "@/lib/types";

export type MoodVisual = {
  icon: string;
  accent: string;
};

const visuals: Record<string, MoodVisual> = {
  anxious: { icon: "/icons/moods/anxious.svg", accent: "#4a8fa3" },
  sad: { icon: "/icons/moods/sad.svg", accent: "#6b7f9e" },
  angry: { icon: "/icons/moods/angry.svg", accent: "#c45a3a" },
  confused: { icon: "/icons/moods/confused.svg", accent: "#9a8450" },
  grieving: { icon: "/icons/moods/grieving.svg", accent: "#7a6a90" },
  lonely: { icon: "/icons/moods/lonely.svg", accent: "#4a6a8a" },
  overwhelmed: { icon: "/icons/moods/overwhelmed.svg", accent: "#3d8a7a" },
  guilty: { icon: "/icons/moods/guilty.svg", accent: "#9a5a6a" },
  jealous: { icon: "/icons/moods/jealous.svg", accent: "#b08a2a" },
  unmotivated: { icon: "/icons/moods/unmotivated.svg", accent: "#6a7380" },
  fearful: { icon: "/icons/moods/fearful.svg", accent: "#5a5e9a" },
  hopeful: { icon: "/icons/moods/hopeful.svg", accent: "#d4a84a" },
  grateful: { icon: "/icons/moods/grateful.svg", accent: "#2f8a6a" },
  "big-decision": { icon: "/icons/moods/big-decision.svg", accent: "#a07a40" },
  conflict: { icon: "/icons/moods/conflict.svg", accent: "#a05040" },
  failure: { icon: "/icons/moods/failure.svg", accent: "#8a5a8a" },
  purpose: { icon: "/icons/moods/purpose.svg", accent: "#e2c45a" },
  happy: { icon: "/icons/moods/happy.svg", accent: "#c9a227" },
};

const fallback: MoodVisual = {
  icon: "/ornaments/empty.svg",
  accent: "#c9a227",
};

export function getMoodVisual(mood: Mood | string): MoodVisual {
  const id = typeof mood === "string" ? mood : mood.id;
  return visuals[id] ?? fallback;
}
