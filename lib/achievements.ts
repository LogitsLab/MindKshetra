/**
 * Achievements catalog + unlock helpers.
 * Private recognition only — no leaderboards.
 */

export type AchievementId =
  | "streak_7"
  | "streak_21"
  | "streak_45"
  | "visit_7"
  | "visit_21"
  | "visit_108"
  | "mala_1"
  | "mala_11"
  | "meditation_7"
  | "meditation_21"
  | "meditation_45"
  | "path_complete"
  | "journal_7"
  | "first_chart"
  | "first_madhav"
  | "verses_108";

export type AchievementDef = {
  id: AchievementId;
  motif: string;
  en: { name: string; line: string };
  hi: { name: string; line: string };
  /** Target progress units (days, malas, verses, etc.) */
  target: number;
};

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  {
    id: "streak_7",
    motif: "surya",
    en: { name: "Seven days steady", line: "A week of returning." },
    hi: { name: "सात दिन स्थिर", line: "लौटने का एक सप्ताह।" },
    target: 7,
  },
  {
    id: "streak_21",
    motif: "patha",
    en: { name: "Twenty-one days", line: "Practice becoming habit." },
    hi: { name: "इक्कीस दिन", line: "अभ्यास स्वभाव बनता हुआ।" },
    target: 21,
  },
  {
    id: "streak_45",
    motif: "kalasha",
    en: { name: "Forty-five days", line: "A deep stretch of constancy." },
    hi: { name: "पैंतालीस दिन", line: "निरंतरता का गहरा विस्तार।" },
    target: 45,
  },
  {
    id: "visit_7",
    motif: "lotus",
    en: { name: "Week of presence", line: "Seven visit days." },
    hi: { name: "उपस्थिति का सप्ताह", line: "सात दिन आना।" },
    target: 7,
  },
  {
    id: "visit_21",
    motif: "wheel",
    en: { name: "Three weeks present", line: "Twenty-one visit days." },
    hi: { name: "तीन सप्ताह उपस्थित", line: "इक्कीस दिन आना।" },
    target: 21,
  },
  {
    id: "visit_108",
    motif: "mala",
    en: { name: "A mala of days", line: "One hundred and eight visits." },
    hi: { name: "दिनों की माला", line: "एक सौ आठ आगमन।" },
    target: 108,
  },
  {
    id: "mala_1",
    motif: "mala",
    en: { name: "First mala", line: "One hundred and eight beads." },
    hi: { name: "पहली माला", line: "एक सौ आठ मनके।" },
    target: 1,
  },
  {
    id: "mala_11",
    motif: "mala",
    en: { name: "Eleven malas", line: "Japa gathering strength." },
    hi: { name: "ग्यारह मालाएँ", line: "जप बल संचित करता।" },
    target: 11,
  },
  {
    id: "meditation_7",
    motif: "lotus",
    en: { name: "Foundation sit", line: "Seven meditation days." },
    hi: { name: "आधार बैठक", line: "सात ध्यान दिन।" },
    target: 7,
  },
  {
    id: "meditation_21",
    motif: "diya",
    en: { name: "Habit sit", line: "Twenty-one meditation days." },
    hi: { name: "स्वाभाविक बैठक", line: "इक्कीस ध्यान दिन।" },
    target: 21,
  },
  {
    id: "meditation_45",
    motif: "kalasha",
    en: { name: "Deepening sit", line: "Forty-five meditation days." },
    hi: { name: "गहन बैठक", line: "पैंतालीस ध्यान दिन।" },
    target: 45,
  },
  {
    id: "path_complete",
    motif: "patha",
    en: { name: "Path walked", line: "A seven-day journey finished." },
    hi: { name: "मार्ग पूरा", line: "सात-दिन की यात्रा पूर्ण।" },
    target: 1,
  },
  {
    id: "journal_7",
    motif: "conch",
    en: { name: "Seven reflections", line: "A week of honest lines." },
    hi: { name: "सात चिंतन", line: "ईमानदार पंक्तियों का सप्ताह।" },
    target: 7,
  },
  {
    id: "first_chart",
    motif: "surya",
    en: { name: "First chart", line: "A Jyotish chart cast." },
    hi: { name: "पहली कुंडली", line: "एक ज्योतिष चार्ट।" },
    target: 1,
  },
  {
    id: "first_madhav",
    motif: "peacock",
    en: { name: "First question", line: "You asked Madhav." },
    hi: { name: "पहला प्रश्न", line: "आपने माधव से पूछा।" },
    target: 1,
  },
  {
    id: "verses_108",
    motif: "patha",
    en: { name: "One hundred eight verses", line: "A mala of reading." },
    hi: { name: "एक सौ आठ श्लोक", line: "पठन की एक माला।" },
    target: 108,
  },
];

export type AchievementProgressInput = {
  visitLongestStreak: number;
  practiceLongestStreak: number;
  malaCount: number;
  meditationDays: number;
  pathsCompleted: number;
  journalDaysOrEntries: number;
  chartsCast: number;
  madhavSessions: number;
  versesRead: number;
};

export type AchievementStatus = {
  id: AchievementId;
  progress: number;
  target: number;
  unlocked: boolean;
  def: AchievementDef;
};

export function evaluateAchievements(
  stats: AchievementProgressInput
): AchievementStatus[] {
  const progressFor = (id: AchievementId): number => {
    switch (id) {
      case "streak_7":
      case "streak_21":
      case "streak_45":
        return stats.practiceLongestStreak;
      case "visit_7":
      case "visit_21":
      case "visit_108":
        return stats.visitLongestStreak;
      case "mala_1":
      case "mala_11":
        return stats.malaCount;
      case "meditation_7":
      case "meditation_21":
      case "meditation_45":
        return stats.meditationDays;
      case "path_complete":
        return stats.pathsCompleted;
      case "journal_7":
        return stats.journalDaysOrEntries;
      case "first_chart":
        return stats.chartsCast;
      case "first_madhav":
        return stats.madhavSessions;
      case "verses_108":
        return stats.versesRead;
      default:
        return 0;
    }
  };

  return ACHIEVEMENT_CATALOG.map((def) => {
    const progress = progressFor(def.id);
    return {
      id: def.id,
      progress: Math.min(progress, def.target),
      target: def.target,
      unlocked: progress >= def.target,
      def,
    };
  });
}
