/**
 * Private Seeker path rank — derived from activity, never public / competitive.
 */

export type SeekerRankKey =
  | "newcomer"
  | "seeker"
  | "practitioner"
  | "steady"
  | "established";

export type SeekerPath = {
  rankKey: SeekerRankKey;
  /** 1-based display level within the path (not a game XP bar). */
  level: number;
  labelEn: string;
  labelHi: string;
};

export type SeekerPathInput = {
  visitLongestStreak: number;
  practiceLongestStreak: number;
  meditationDays: number;
  malaCount: number;
  versesRead: number;
};

const RANK_META: Record<
  SeekerRankKey,
  { en: string; hi: string; minScore: number }
> = {
  newcomer: { en: "Newcomer", hi: "नवागंतुक", minScore: 0 },
  seeker: { en: "Seeker", hi: "साधक", minScore: 7 },
  practitioner: { en: "Practitioner", hi: "अभ्यासी", minScore: 21 },
  steady: { en: "Steady", hi: "स्थिर", minScore: 49 },
  established: { en: "Established", hi: "प्रतिष्ठित", minScore: 108 },
};

export function computeSeekerScore(input: SeekerPathInput): number {
  return Math.max(
    input.visitLongestStreak,
    input.practiceLongestStreak,
    input.meditationDays,
    Math.floor(input.malaCount),
    Math.floor(input.versesRead / 7)
  );
}

export function computeSeekerPath(input: SeekerPathInput): SeekerPath {
  const score = computeSeekerScore(input);
  let rankKey: SeekerRankKey = "newcomer";
  for (const key of [
    "established",
    "steady",
    "practitioner",
    "seeker",
    "newcomer",
  ] as const) {
    if (score >= RANK_META[key].minScore) {
      rankKey = key;
      break;
    }
  }
  const level = Math.max(1, Math.min(99, Math.floor(score / 3) + 1));
  return {
    rankKey,
    level,
    labelEn: RANK_META[rankKey].en,
    labelHi: RANK_META[rankKey].hi,
  };
}
