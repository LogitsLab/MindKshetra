/**
 * Quiet milestones (WS4): private marks for staying with the practice.
 * No points, no levels, no leaderboards — the ladder below is the entire
 * system, and everything computed from it is shown only to its own user.
 *
 * Pure module: no I/O, no server imports. The account API composes stats
 * from Supabase; guests compose the same shape from device-local logs.
 * Streak marks read LONGEST streaks — a mark, once earned, is never
 * un-earned by a streak resetting (invitational, never guilt).
 */

export const VISIT_LADDER = [2, 7, 21, 49, 108] as const;
export const PRACTICE_LADDER = [7, 21, 108] as const;
/** Lifetime malas: sum(sadhana_sessions.count for japa) / 108, floored. */
export const MALA_LADDER = [1, 11, 108] as const;
export const READING_LADDER = [1, 108] as const;
export const DEFAULT_TOTAL_VERSES = 700;

/**
 * Thin brass-stroke motifs (components/MilestoneMarks.tsx): the six
 * avatar-preset names from lib/profiles.ts plus four new ones drawn in the
 * same style.
 */
export type MilestoneMotif =
  | "lotus"
  | "conch"
  | "wheel"
  | "diya"
  | "veena"
  | "peacock"
  | "mala"
  | "surya"
  | "kalasha"
  | "patha";

export type MilestoneText = { name: string; line: string };

export type Milestone = {
  key: string;
  motif: MilestoneMotif;
  en: MilestoneText;
  hi: MilestoneText;
};

export const PRACTICE_LABELS = {
  flow: { en: "sādhana", hi: "साधना" },
  japa: { en: "japa", hi: "जप" },
  sit: { en: "quiet sit", hi: "शांत बैठक" },
  pranayama: { en: "pranayama", hi: "प्राणायाम" },
} as const;

export type MilestonePractice = keyof typeof PRACTICE_LABELS;

export type MilestoneStats = {
  /** Longest visit streak in days (user_streaks.longest_streak). */
  visitStreakDays?: number;
  /** Longest streak per practice (sadhana_streaks.longest_streak). */
  practiceStreakDays?: Partial<Record<MilestonePractice, number>>;
  /** Lifetime japa count in beads, not malas. */
  japaLifetimeCount?: number;
  /** Verses ever completed (verse_completions rows). */
  versesRead?: number;
  /** Chapter numbers whose every verse is completed. */
  chaptersCompleted?: number[];
  /** Corpus size for the "whole Gītā" mark; defaults to 700. */
  totalVerses?: number;
  /** Paths walked to their last day, with titles for the mark's name. */
  pathsCompleted?: Array<{ id: string; titleEn: string; titleHi: string }>;
};

const VISIT_TEXT: Record<number, Milestone["en"] & { hiName: string; hiLine: string }> = {
  2: {
    name: "Punaḥ — the return",
    line: "Two days, one after the other. Returning is the practice.",
    hiName: "पुनः — वापसी",
    hiLine: "दो दिन, एक के बाद एक। लौटना ही अभ्यास है।",
  },
  7: {
    name: "Sthira — a steady week",
    line: "Seven days of showing up.",
    hiName: "स्थिर — एक सधा सप्ताह",
    hiLine: "सात दिन, हर दिन उपस्थित।",
  },
  21: {
    name: "Abhyāsa — three weeks",
    line: "Twenty-one days, practice becoming habit.",
    hiName: "अभ्यास — तीन सप्ताह",
    hiLine: "इक्कीस दिन — अभ्यास स्वभाव बनता हुआ।",
  },
  49: {
    name: "Dhairya — seven weeks",
    line: "Forty-nine days of quiet constancy.",
    hiName: "धैर्य — सात सप्ताह",
    hiLine: "उनचास दिन की शांत निरंतरता।",
  },
  108: {
    name: "Akhaṇḍa — one hundred and eight",
    line: "A mala of days, unbroken.",
    hiName: "अखण्ड — एक सौ आठ",
    hiLine: "दिनों की एक माला, अखंड।",
  },
};

const PRACTICE_MOTIF: Record<MilestonePractice, MilestoneMotif> = {
  flow: "diya",
  japa: "mala",
  sit: "lotus",
  pranayama: "conch",
};

function practiceMilestone(
  practice: MilestonePractice,
  days: (typeof PRACTICE_LADDER)[number]
): Milestone {
  const label = PRACTICE_LABELS[practice];
  const text = {
    7: {
      name: `Niyama — a week of ${label.en}`,
      line: `Seven days with ${label.en}.`,
      hiName: `नियम — ${label.hi} का एक सप्ताह`,
      hiLine: `${label.hi} के साथ सात दिन।`,
    },
    21: {
      name: `Tapas — three weeks of ${label.en}`,
      line: "Twenty-one days, held gently.",
      hiName: `तपस् — ${label.hi} के तीन सप्ताह`,
      hiLine: "इक्कीस दिन, सहजता से निभाए।",
    },
    108: {
      name: `Vrata — 108 days of ${label.en}`,
      line: "A vow kept, day after day.",
      hiName: `व्रत — ${label.hi} के १०८ दिन`,
      hiLine: "एक व्रत, दिन-प्रतिदिन निभाया।",
    },
  }[days];
  return {
    key: `practice-${practice}-${days}`,
    motif: PRACTICE_MOTIF[practice],
    en: { name: text.name, line: text.line },
    hi: { name: text.hiName, line: text.hiLine },
  };
}

const MALA_TEXT: Record<number, { name: string; line: string; hiName: string; hiLine: string }> = {
  1: {
    name: "Prathamā mālā",
    line: "Your first full mala — 108 counted.",
    hiName: "प्रथमा माला",
    hiLine: "आपकी पहली पूर्ण माला — १०८।",
  },
  11: {
    name: "Ekādaśa mālā",
    line: "Eleven malas, bead by bead.",
    hiName: "एकादश माला",
    hiLine: "ग्यारह मालाएँ, मनके-दर-मनके।",
  },
  108: {
    name: "Mahāmālā",
    line: "One hundred and eight malas.",
    hiName: "महामाला",
    hiLine: "एक सौ आठ मालाएँ।",
  },
};

function chapterMilestone(chapter: number): Milestone {
  return {
    key: `chapter-${chapter}`,
    motif: "wheel",
    en: {
      name: `Adhyāya ${chapter}`,
      line: `Every verse of chapter ${chapter}, read.`,
    },
    hi: {
      name: `अध्याय ${chapter}`,
      line: `अध्याय ${chapter} का हर श्लोक पढ़ा।`,
    },
  };
}

/**
 * Every milestone the given stats have earned, in canonical ladder order:
 * visits, per-practice streaks, japa malas, reading, chapters, paths.
 */
export function milestonesFor(stats: MilestoneStats): Milestone[] {
  const earned: Milestone[] = [];

  const visit = stats.visitStreakDays ?? 0;
  for (const days of VISIT_LADDER) {
    if (visit >= days) {
      const text = VISIT_TEXT[days];
      earned.push({
        key: `visit-${days}`,
        motif: "surya",
        en: { name: text.name, line: text.line },
        hi: { name: text.hiName, line: text.hiLine },
      });
    }
  }

  for (const practice of Object.keys(PRACTICE_LABELS) as MilestonePractice[]) {
    const days = stats.practiceStreakDays?.[practice] ?? 0;
    for (const step of PRACTICE_LADDER) {
      if (days >= step) earned.push(practiceMilestone(practice, step));
    }
  }

  const malas = Math.floor((stats.japaLifetimeCount ?? 0) / 108);
  for (const step of MALA_LADDER) {
    if (malas >= step) {
      const text = MALA_TEXT[step];
      earned.push({
        key: `japa-mala-${step}`,
        motif: "mala",
        en: { name: text.name, line: text.line },
        hi: { name: text.hiName, line: text.hiLine },
      });
    }
  }

  const verses = stats.versesRead ?? 0;
  if (verses >= 1) {
    earned.push({
      key: "reading-1",
      motif: "veena",
      en: { name: "Prārambha — a beginning", line: "Your first verse, complete." },
      hi: { name: "प्रारम्भ", line: "आपका पहला श्लोक पूर्ण।" },
    });
  }
  if (verses >= 108) {
    earned.push({
      key: "reading-108",
      motif: "veena",
      en: { name: "Aṣṭottara — 108 verses", line: "A mala of verses read." },
      hi: { name: "अष्टोत्तर — १०८ श्लोक", line: "श्लोकों की एक माला पूर्ण।" },
    });
  }

  const chapters = Array.from(new Set(stats.chaptersCompleted ?? [])).sort(
    (a, b) => a - b
  );
  for (const chapter of chapters) earned.push(chapterMilestone(chapter));

  const totalVerses = stats.totalVerses ?? DEFAULT_TOTAL_VERSES;
  if (totalVerses > 0 && verses >= totalVerses) {
    earned.push({
      key: "reading-all",
      motif: "kalasha",
      en: {
        name: "Pūrṇatā — the whole Gītā",
        line: "Every verse, met at least once.",
      },
      hi: { name: "पूर्णता — सम्पूर्ण गीता", line: "हर श्लोक से भेंट हुई।" },
    });
  }

  for (const path of stats.pathsCompleted ?? []) {
    earned.push({
      key: `path-${path.id}`,
      motif: "patha",
      en: { name: `Mārga — ${path.titleEn}`, line: "Walked to its last day." },
      hi: { name: `मार्ग — ${path.titleHi}`, line: "अंतिम दिन तक चला।" },
    });
  }

  return earned;
}

/**
 * The nearest not-yet-earned mark, by proportional progress on the numeric
 * ladders (visit, practice, malas, reading). Chapter and path marks carry no
 * scalar progress in stats, so they are never proposed — they announce
 * themselves when crossed.
 */
export function nextMilestone(stats: MilestoneStats): Milestone | null {
  const verses = stats.versesRead ?? 0;
  const totalVerses = stats.totalVerses ?? DEFAULT_TOTAL_VERSES;

  type Candidate = { fraction: number; milestone: Milestone };
  const candidates: Candidate[] = [];

  const visit = stats.visitStreakDays ?? 0;
  const nextVisit = VISIT_LADDER.find((d) => visit < d);
  if (nextVisit) {
    const text = VISIT_TEXT[nextVisit];
    candidates.push({
      fraction: visit / nextVisit,
      milestone: {
        key: `visit-${nextVisit}`,
        motif: "surya",
        en: { name: text.name, line: text.line },
        hi: { name: text.hiName, line: text.hiLine },
      },
    });
  }

  for (const practice of Object.keys(PRACTICE_LABELS) as MilestonePractice[]) {
    const days = stats.practiceStreakDays?.[practice] ?? 0;
    const step = PRACTICE_LADDER.find((d) => days < d);
    if (step) {
      candidates.push({
        fraction: days / step,
        milestone: practiceMilestone(practice, step),
      });
    }
  }

  const malas = Math.floor((stats.japaLifetimeCount ?? 0) / 108);
  const nextMala = MALA_LADDER.find((m) => malas < m);
  if (nextMala) {
    const text = MALA_TEXT[nextMala];
    candidates.push({
      fraction: malas / nextMala,
      milestone: {
        key: `japa-mala-${nextMala}`,
        motif: "mala",
        en: { name: text.name, line: text.line },
        hi: { name: text.hiName, line: text.hiLine },
      },
    });
  }

  const readingSteps: Array<{ at: number; milestone: Milestone }> = [
    {
      at: 1,
      milestone: {
        key: "reading-1",
        motif: "veena",
        en: {
          name: "Prārambha — a beginning",
          line: "Your first verse, complete.",
        },
        hi: { name: "प्रारम्भ", line: "आपका पहला श्लोक पूर्ण।" },
      },
    },
    {
      at: 108,
      milestone: {
        key: "reading-108",
        motif: "veena",
        en: { name: "Aṣṭottara — 108 verses", line: "A mala of verses read." },
        hi: { name: "अष्टोत्तर — १०८ श्लोक", line: "श्लोकों की एक माला पूर्ण।" },
      },
    },
    {
      at: totalVerses,
      milestone: {
        key: "reading-all",
        motif: "kalasha",
        en: {
          name: "Pūrṇatā — the whole Gītā",
          line: "Every verse, met at least once.",
        },
        hi: { name: "पूर्णता — सम्पूर्ण गीता", line: "हर श्लोक से भेंट हुई।" },
      },
    },
  ];
  const nextReading = readingSteps.find((s) => s.at > 0 && verses < s.at);
  if (nextReading) {
    candidates.push({
      fraction: verses / nextReading.at,
      milestone: nextReading.milestone,
    });
  }

  if (candidates.length === 0) return null;
  // Ties (e.g. everything at zero) resolve to the earliest ladder above —
  // the first "next" a new practice meets is simply returning tomorrow.
  let best = candidates[0];
  for (const c of candidates) {
    if (c.fraction > best.fraction) best = c;
  }
  return best.milestone;
}

/**
 * Marks earned by `after` that `before` had not earned — the "newly crossed"
 * set a completion moment may show (at most one of, per DESIGN's quiet rule).
 */
export function newlyCrossed(
  before: MilestoneStats,
  after: MilestoneStats
): Milestone[] {
  const had = new Set(milestonesFor(before).map((m) => m.key));
  return milestonesFor(after).filter((m) => !had.has(m.key));
}
