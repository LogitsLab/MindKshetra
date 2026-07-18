import type { Mood } from "@/lib/types";

export type MoodVisual = {
  icon: string;
  accent: string;
};

const visuals: Record<string, MoodVisual> = {
  anxious: { icon: "/icons/moods/anxious.svg", accent: "#5b8a9a" },
  sad: { icon: "/icons/moods/sad.svg", accent: "#6b7f9e" },
  angry: { icon: "/icons/moods/angry.svg", accent: "#b06a4a" },
  confused: { icon: "/icons/moods/confused.svg", accent: "#8a7a5c" },
  grieving: { icon: "/icons/moods/grieving.svg", accent: "#6a7590" },
  lonely: { icon: "/icons/moods/lonely.svg", accent: "#5a7088" },
  overwhelmed: { icon: "/icons/moods/overwhelmed.svg", accent: "#4a7a72" },
  guilty: { icon: "/icons/moods/guilty.svg", accent: "#8a6a6a" },
  jealous: { icon: "/icons/moods/jealous.svg", accent: "#9a7a3a" },
  unmotivated: { icon: "/icons/moods/unmotivated.svg", accent: "#6a7380" },
  fearful: { icon: "/icons/moods/fearful.svg", accent: "#5a6e8a" },
  hopeful: { icon: "/icons/moods/hopeful.svg", accent: "#c9a227" },
  grateful: { icon: "/icons/moods/grateful.svg", accent: "#3d7a6a" },
  "big-decision": { icon: "/icons/moods/big-decision.svg", accent: "#a08a4a" },
  conflict: { icon: "/icons/moods/conflict.svg", accent: "#a06050" },
  failure: { icon: "/icons/moods/failure.svg", accent: "#7a6a7a" },
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
