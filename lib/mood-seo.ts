/**
 * Search-facing copy for the mood pages, keyed by mood id.
 *
 * Mood pages are the product's front door for search — people arrive typing
 * how they feel ("bhagavad gita verses for anxiety"). Titles used to be
 * assembled from the label ("Feeling feeling like a failure") and
 * descriptions from raw tag slugs. This is hand-written instead, and lives
 * apart from lib/moods-data.ts because moods are served from the database in
 * production, and because that file sits behind the retrieval eval gate.
 *
 * `pathId` links the matching 7-day path; `care` adds the helplines link for
 * moods where someone may be struggling.
 */
export type MoodSeo = {
  title: string;
  description: string;
  /** Visible H1, phrased the way the page is searched for. */
  heading: string;
  pathId?: string;
  care?: boolean;
};

export const MOOD_SEO: Readonly<Record<string, MoodSeo>> = {
  anxious: {
    title: "Bhagavad Gita verses for anxiety",
    heading: "Bhagavad Gita verses for anxiety",
    description:
      "Bhagavad Gita verses for anxiety and fear: on steadying a restless mind and acting without clinging to outcomes, with Sanskrit, Hindi and English meaning.",
    pathId: "anxiety-7",
    care: true,
  },
  sad: {
    title: "Bhagavad Gita verses for when you feel sad",
    heading: "Bhagavad Gita verses for sadness",
    description:
      "Bhagavad Gita verses for sadness, loss and loneliness, and for finding contentment again, with Sanskrit, Hindi and English meaning.",
    pathId: "grief-7",
    care: true,
  },
  angry: {
    title: "Bhagavad Gita verses on anger",
    heading: "Bhagavad Gita verses on anger",
    description:
      "What the Bhagavad Gita says about anger: where it comes from, how it clouds judgement and how to master the mind, with Sanskrit, Hindi and English meaning.",
    pathId: "relationships-7",
  },
  confused: {
    title: "Bhagavad Gita verses for confusion and doubt",
    heading: "Bhagavad Gita verses for confusion",
    description:
      "Bhagavad Gita verses for confusion and doubt: on duty, purpose and seeing clearly, as Arjuna did at Kurukshetra, with Sanskrit, Hindi and English meaning.",
    pathId: "purpose-7",
  },
  grieving: {
    title: "Bhagavad Gita verses for grief and loss",
    heading: "Bhagavad Gita verses for grief",
    description:
      "Bhagavad Gita verses for grief and the death of a loved one: on impermanence, the undying self and equanimity, with Sanskrit, Hindi and English meaning.",
    pathId: "grief-7",
    care: true,
  },
  lonely: {
    title: "Bhagavad Gita verses for loneliness",
    heading: "Bhagavad Gita verses for loneliness",
    description:
      "Bhagavad Gita verses for loneliness: on devotion, belonging and purpose when you feel alone, with Sanskrit, Hindi and English meaning.",
    pathId: "relationships-7",
    care: true,
  },
  overwhelmed: {
    title: "Bhagavad Gita verses for stress and overwhelm",
    heading: "Bhagavad Gita verses for stress",
    description:
      "Bhagavad Gita verses for stress, overwhelm and burnout: on equanimity and doing your work without clinging to results, with Sanskrit, Hindi and English meaning.",
    pathId: "anxiety-7",
    care: true,
  },
  guilty: {
    title: "Bhagavad Gita verses on guilt",
    heading: "Bhagavad Gita verses on guilt",
    description:
      "Bhagavad Gita verses on guilt and regret: on duty, responsibility and acting rightly from here on, with Sanskrit, Hindi and English meaning.",
    care: true,
  },
  jealous: {
    title: "Bhagavad Gita verses on jealousy and comparison",
    heading: "Bhagavad Gita verses on jealousy",
    description:
      "Bhagavad Gita verses on jealousy, comparison and ego, and on walking your own path, with Sanskrit, Hindi and English meaning.",
  },
  unmotivated: {
    title: "Bhagavad Gita verses for motivation",
    heading: "Bhagavad Gita verses for motivation",
    description:
      "Bhagavad Gita verses for when you feel unmotivated: on courage, duty and getting up to act, with Sanskrit, Hindi and English meaning.",
    pathId: "purpose-7",
  },
  fearful: {
    title: "Bhagavad Gita verses on fear",
    heading: "Bhagavad Gita verses on fear",
    description:
      "Bhagavad Gita verses on fear: on courage, hope and the self that cannot be harmed, with Sanskrit, Hindi and English meaning.",
    pathId: "anxiety-7",
    care: true,
  },
  hopeful: {
    title: "Bhagavad Gita verses on hope",
    heading: "Bhagavad Gita verses on hope",
    description:
      "Bhagavad Gita verses on hope, gratitude and purpose, for days that feel open, with Sanskrit, Hindi and English meaning.",
  },
  grateful: {
    title: "Bhagavad Gita verses on gratitude",
    heading: "Bhagavad Gita verses on gratitude",
    description:
      "Bhagavad Gita verses on gratitude, devotion and contentment, with Sanskrit, Hindi and English meaning.",
  },
  "big-decision": {
    title: "Bhagavad Gita verses for a big decision",
    heading: "Bhagavad Gita verses for a big decision",
    description:
      "Bhagavad Gita verses for facing a big decision: on duty, courage and choosing clearly, as Arjuna did, with Sanskrit, Hindi and English meaning.",
    pathId: "purpose-7",
  },
  conflict: {
    title: "Bhagavad Gita verses for conflict",
    heading: "Bhagavad Gita verses for conflict",
    description:
      "Bhagavad Gita verses for conflict in relationships: on anger, equanimity and acting without hatred, with Sanskrit, Hindi and English meaning.",
    pathId: "relationships-7",
  },
  failure: {
    title: "Bhagavad Gita verses for when you feel like a failure",
    heading: "Bhagavad Gita verses for feeling like a failure",
    description:
      "Bhagavad Gita verses for when you feel like a failure: on self-worth, courage and acting without clinging to results, with Sanskrit, Hindi and English meaning.",
    pathId: "student-7",
    care: true,
  },
  purpose: {
    title: "Bhagavad Gita verses on purpose and meaning",
    heading: "Bhagavad Gita verses on purpose",
    description:
      "Bhagavad Gita verses for searching for purpose: on svadharma, duty and devotion, with Sanskrit, Hindi and English meaning.",
    pathId: "purpose-7",
  },
  happy: {
    title: "Bhagavad Gita verses for happy days",
    heading: "Bhagavad Gita verses for happy days",
    description:
      "Bhagavad Gita verses for happy days: on gratitude, equanimity and joy without attachment, with Sanskrit, Hindi and English meaning.",
  },
};

export function moodSeo(id: string): MoodSeo | undefined {
  return MOOD_SEO[id];
}
