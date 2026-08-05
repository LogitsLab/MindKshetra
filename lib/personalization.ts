/**
 * Frozen EN/HI copy for the 5-step personalization onboarding.
 * Shared by web, app, and Stitch prompts — do not invent alternate labels.
 */

export const ONBOARDING_VERSION = 7;

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
  {
    id: "balanced",
    en: "Balanced",
    hi: "संतुलित",
    blurbEn:
      "Verse and practice together — a Gita teaching, then a short sit, japa, or breath.",
    blurbHi:
      "श्लोक और अभ्यास साथ — गीता की शिक्षा, फिर छोटी बैठक, जप या श्वास।",
  },
  {
    id: "gita_first",
    en: "Gita-first",
    hi: "गीता पहले",
    blurbEn:
      "Start with a verse and Madhav’s clarity. Practice (japa, sit, breath) follows when you’re ready.",
    blurbHi:
      "पहले श्लोक और माधव की स्पष्टता। अभ्यास (जप, बैठक, श्वास) जब आप तैयार हों।",
  },
  {
    id: "practice_first",
    en: "Practice-first",
    hi: "अभ्यास पहले",
    blurbEn:
      "Lead with the body and breath — japa (mantra on the beads), sits, and pranayama — then meet the verse.",
    blurbHi:
      "पहले शरीर और श्वास — जप (मनके पर मंत्र), बैठक और प्राणायाम — फिर श्लोक।",
  },
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
    title: { en: "Guided by Madhav", hi: "माधव का मार्गदर्शन" },
    eyebrow: { en: "Kurukshetra", hi: "कुरुक्षेत्र" },
    sceneTitle: {
      en: "When all feels against you",
      hi: "जब सब खिलाफ लगे",
    },
    body: {
      en: "The Gita begins here — doubt meets clarity.",
      hi: "गीता यहीं से शुरू होती है — संशय और स्पष्टता।",
    },
    dialogue: {
      arjun: {
        label: { en: "Arjun", hi: "अर्जुन" },
        hi: "सब खिलाफ है माधव",
        en: "Everyone is against me, Madhav",
      },
      krishna: {
        label: { en: "Madhav", hi: "माधव" },
        hi: "सब हारेंगे पार्थ",
        en: "Everyone will lose, Parth",
      },
    },
    sloka: {
      ref: { en: "Bhagavad Gita 2.3", hi: "भगवद्गीता २.३" },
      sanskrit:
        "क्लैब्यं मा स्म गमः पार्थ नैतत्त्वय्युपपद्यते।\nक्षुद्रं हृदयदौर्बल्यं त्यक्त्वोत्तिष्ठ परन्तप॥",
      en: "Do not yield to this weakness, O Partha. It does not become you. Cast it off and stand up, conqueror of foes.",
      hi: "हे पार्थ! इस दुर्बलता को मत अपनाओ — यह तुम्हें शोभा नहीं देती। इसे त्याग कर खड़े हो जाओ, हे परंतप!",
    },
    none: { en: "No Preference", hi: "कोई प्राथमिकता नहीं" },
    next: { en: "Continue with Madhav", hi: "माधव के साथ आगे" },
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
    guidance: { en: "How should we guide you?", hi: "हम कैसे मार्गदर्शन करें?" },
    guidanceBody: {
      en: "Gita brings teaching through verse. Practice is what you do with the body and breath — including japa, the quiet repetition of a mantra on a mala.",
      hi: "गीता श्लोक से शिक्षा देती है। अभ्यास वह है जो आप शरीर और श्वास से करते हैं — इसमें जप भी है: माला पर मंत्र का शांत दोहराव।",
    },
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
