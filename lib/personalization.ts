/**
 * Frozen EN/HI copy for the 5-step personalization onboarding.
 * Shared by web, app, and Stitch prompts — do not invent alternate labels.
 */

export const ONBOARDING_VERSION = 6;

export const GOALS = [
  { id: "inner_peace", en: "Inner Peace", hi: "आंतरिक शांति" },
  { id: "stress_relief", en: "Stress Relief", hi: "तनाव मुक्ति" },
  { id: "self_realization", en: "Self Realization", hi: "आत्म-साक्षात्कार" },
  { id: "devotion", en: "Devotion", hi: "भक्ति" },
  { id: "purpose", en: "Purpose", hi: "उद्देश्य" },
  { id: "healing", en: "Healing", hi: "उपचार" },
  { id: "knowledge", en: "Knowledge", hi: "ज्ञान" },
  { id: "relationships", en: "Relationships", hi: "संबंध" },
  { id: "other", en: "Other", hi: "अन्य" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];

export const INSPIRATIONS = [
  { id: "krishna", en: "Krishna", hi: "कृष्ण" },
  { id: "shiva", en: "Shiva", hi: "शिव" },
  { id: "rama", en: "Rama", hi: "राम" },
  { id: "devi", en: "Devi", hi: "देवी" },
  { id: "hanuman", en: "Hanuman", hi: "हनुमान" },
  { id: "buddha", en: "Buddha", hi: "बुद्ध" },
] as const;

export type InspirationId = (typeof INSPIRATIONS)[number]["id"];

export const DAILY_TIME_OPTIONS = [
  { minutes: 5, en: "5 min", hi: "५ मिनट" },
  { minutes: 10, en: "10 min", hi: "१० मिनट" },
  { minutes: 20, en: "20 min", hi: "२० मिनट" },
  { minutes: 30, en: "30 min", hi: "३० मिनट" },
  { minutes: 60, en: "1 hour+", hi: "१ घंटा+" },
] as const;

export const GUIDANCE_STYLES = [
  { id: "balanced", en: "Balanced (all paths)", hi: "संतुलित (सभी मार्ग)" },
  { id: "gita_first", en: "Gita-first", hi: "गीता पहले" },
  { id: "practice_first", en: "Practice-first", hi: "अभ्यास पहले" },
] as const;

export type GuidanceStyleId = (typeof GUIDANCE_STYLES)[number]["id"];

export const ONBOARDING_COPY = {
  welcome: {
    title: { en: "MindKshetra", hi: "MindKshetra" },
    subtitle: {
      en: "Your Spiritual Companion",
      hi: "आपका आध्यात्मिक साथी",
    },
    tagline: {
      en: "Clarity from the Gita, for the battlefield of the mind.",
      hi: "गीता से स्पष्टता — मन के युद्धक्षेत्र के लिए।",
    },
    continue: { en: "Continue", hi: "आगे बढ़ें" },
    skip: { en: "Skip", hi: "छोड़ें" },
  },
  goals: {
    title: { en: "What brings you here?", hi: "आप यहाँ क्यों आए हैं?" },
    body: {
      en: "Choose all that speak to you.",
      hi: "जो भी आपको छूता है, चुनें।",
    },
    next: { en: "Next", hi: "आगे" },
  },
  inspirations: {
    title: { en: "Who inspires you?", hi: "आपको कौन प्रेरित करता है?" },
    body: {
      en: "Optional — shapes soft accents, never locks content.",
      hi: "वैकल्पिक — केवल नरम स्वर; सामग्री कभी बंद नहीं होती।",
    },
    none: { en: "No Preference", hi: "कोई प्राथमिकता नहीं" },
    next: { en: "Next", hi: "आगे" },
  },
  time: {
    title: {
      en: "How much time can you dedicate?",
      hi: "आप कितना समय दे सकते हैं?",
    },
    body: {
      en: "We'll suggest sits and practices that fit.",
      hi: "हम उसी के अनुकूल बैठक और अभ्यास सुझाएँगे।",
    },
    next: { en: "Next", hi: "आगे" },
  },
  setup: {
    title: { en: "Your journey setup", hi: "आपकी यात्रा सेटअप" },
    language: { en: "Preferred language", hi: "पसंदीदा भाषा" },
    guidance: { en: "Preferred guidance style", hi: "मार्गदर्शन शैली" },
    name: { en: "Your name", hi: "आपका नाम" },
    namePlaceholder: { en: "Optional", hi: "वैकल्पिक" },
    creating: {
      en: "Your personal journey is being created.",
      hi: "आपकी व्यक्तिगत यात्रा बन रही है।",
    },
    start: { en: "Start My Journey", hi: "यात्रा शुरू करें" },
  },
} as const;

export type PersonalizationDraft = {
  goals: GoalId[];
  inspirations: InspirationId[];
  dailyTimeMinutes: number | null;
  guidanceStyle: GuidanceStyleId | null;
  displayName: string;
  preferredLanguage: "en" | "hi";
  skipped?: boolean;
};

export const EMPTY_PERSONALIZATION: PersonalizationDraft = {
  goals: [],
  inspirations: [],
  dailyTimeMinutes: 10,
  guidanceStyle: "balanced",
  displayName: "",
  preferredLanguage: "en",
  skipped: false,
};

export function isGoalId(v: string): v is GoalId {
  return GOALS.some((g) => g.id === v);
}

export function isInspirationId(v: string): v is InspirationId {
  return INSPIRATIONS.some((i) => i.id === v);
}

export function isGuidanceStyleId(v: string): v is GuidanceStyleId {
  return GUIDANCE_STYLES.some((g) => g.id === v);
}

export function sanitizeGoals(raw: unknown): GoalId[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((x): x is string => typeof x === "string").filter(isGoalId))
  );
}

export function sanitizeInspirations(raw: unknown): InspirationId[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw.filter((x): x is string => typeof x === "string").filter(isInspirationId)
    )
  );
}

export function sanitizeDailyTime(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const allowed = DAILY_TIME_OPTIONS.map((o) => o.minutes);
  return allowed.includes(raw as (typeof allowed)[number]) ? raw : null;
}
