import { getAllSlokas } from "@/lib/slokas";
import type { ChatMessage, Sloka } from "@/lib/types";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "is", "am", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "must", "shall", "can", "need", "dare", "ought", "used", "i",
  "me", "my", "myself", "we", "our", "ours", "you", "your", "yours", "he",
  "she", "it", "they", "them", "their", "this", "that", "these", "those",
  "what", "which", "who", "whom", "how", "when", "where", "why", "with",
  "from", "into", "about", "over", "after", "before", "between", "through",
  "during", "above", "below", "up", "down", "out", "off", "again", "further",
  "then", "once", "here", "there", "all", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
  "than", "too", "very", "just", "also", "now", "im", "ive", "dont", "cant",
  "feeling", "feel", "feels", "felt", "like", "really", "please", "help",
  "gita", "verse", "teaching", "krishna",
]);

/** Broad tags get lower boost so they don't dominate every query. */
const TAG_WEIGHT: Record<string, number> = {
  devotion_surrender: 1.1,
  purpose_meaning: 1.1,
  duty_responsibility: 2.2,
  equanimity: 2.4,
  control_of_mind: 2.5,
  action_without_attachment: 2.8,
  anxiety_fear: 3.2,
  grief_loss: 3.2,
  anger: 3.2,
  confusion_decision: 3,
  overwhelm_burnout: 3,
  loneliness: 3,
  guilt: 3,
  jealousy_comparison: 3.5,
  low_self_worth: 3.2,
  attachment_desire: 2.8,
  detachment: 2.5,
  courage: 3,
  success_ambition: 2.8,
  relationships_conflict: 3,
  gratitude_contentment: 2.5,
  impermanence_mortality: 2.5,
  discipline_habit: 3.2,
  ego_pride: 3,
  hope: 3,
  unmotivated: 3.2,
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  anxiety_fear: ["anxious", "anxiety", "afraid", "fear", "scared", "worried", "worry", "nervous", "panic"],
  grief_loss: ["grief", "grieving", "loss", "lost", "death", "died", "mourn", "sad", "sorrow", "cry", "crying"],
  anger: ["angry", "anger", "rage", "furious", "mad", "irritated", "resent"],
  confusion_decision: ["confused", "confusion", "decision", "decide", "unsure", "stuck", "dilemma", "choice"],
  overwhelm_burnout: ["overwhelmed", "overwhelm", "burnout", "burned", "exhausted", "stressed", "stress", "too much"],
  loneliness: ["lonely", "alone", "isolated", "isolation", "nobody"],
  guilt: ["guilt", "guilty", "ashamed", "shame", "regret"],
  jealousy_comparison: ["jealous", "jealousy", "envy", "compare", "comparison", "unfair"],
  low_self_worth: ["failure", "fail", "worthless", "inadequate", "not enough", "useless"],
  duty_responsibility: ["duty", "responsibility", "work", "job", "obligation", "should"],
  purpose_meaning: ["purpose", "meaning", "direction", "pointless"],
  attachment_desire: ["desire", "want", "craving", "attached", "attachment", "obsess", "addiction"],
  detachment: ["let go", "letting go", "detach", "release"],
  courage: ["courage", "brave", "stand up", "strength"],
  equanimity: ["calm", "peace", "balance", "steady"],
  control_of_mind: ["mind", "thoughts", "racing", "focus", "distract", "meditation"],
  success_ambition: ["success", "ambition", "career", "win", "achieve", "goal"],
  relationships_conflict: ["conflict", "fight", "argument", "relationship", "partner", "family"],
  gratitude_contentment: ["grateful", "gratitude", "thankful", "content", "happy", "joy"],
  devotion_surrender: ["faith", "pray", "god", "surrender", "devote"],
  action_without_attachment: ["result", "outcome", "fruit", "expect"],
  impermanence_mortality: ["death", "dying", "change", "impermanent", "mortal"],
  discipline_habit: ["habit", "discipline", "routine", "practice", "lazy", "addiction"],
  ego_pride: ["ego", "pride", "arrogant", "humble"],
  hope: ["hope", "hopeful", "optimistic", "better"],
  unmotivated: ["unmotivated", "motivation", "lazy", "apathetic", "give up"],
};

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const latin = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Keep Devanagari tokens (2+ chars)
  const hindi = (text.match(/[\u0900-\u097F]{2,}/g) || []).map((w) =>
    w.toLowerCase()
  );

  return Array.from(new Set(latin.concat(hindi)));
}

function inferredTags(query: string): string[] {
  const lower = query.toLowerCase();
  const hits: string[] = [];
  for (const [tag, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      hits.push(tag);
    }
  }
  return hits;
}

/** Build a retrieval query from recent user turns (not only the last message). */
export function buildRetrievalQuery(messages: ChatMessage[]): string {
  const userTurns = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);
  if (userTurns.length === 0) return "";
  // Weight latest turn highest by repeating it
  const latest = userTurns[userTurns.length - 1];
  const earlier = userTurns.slice(-3, -1).join(" ");
  return `${latest} ${latest} ${earlier}`.trim();
}

export function retrieveSlokas(query: string, limit = 5): Sloka[] {
  const tokens = tokenize(query);
  const tags = inferredTags(query);
  const tagSet = new Set(tags);
  const all = getAllSlokas();

  // IDF-ish: rarer tags among corpus score higher when matched via keywords only
  const tagFreq = new Map<string, number>();
  for (const s of all) {
    for (const t of s.tags) {
      tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
    }
  }

  const scored = all.map((sloka) => {
    let score = 0;
    const haystack = [
      sloka.english_translation,
      sloka.hindi_translation,
      sloka.transliteration_iast,
      ...sloka.tags,
    ]
      .join(" ")
      .toLowerCase();

    for (const token of tokens) {
      if (haystack.includes(token)) score += 1.5;
      if (sloka.tags.some((t) => t.replace(/_/g, " ").includes(token))) {
        score += 2;
      }
    }

    for (const tag of sloka.tags) {
      if (!tagSet.has(tag)) continue;
      const freq = tagFreq.get(tag) || 1;
      const rarity = Math.min(3, 700 / freq);
      const weight = TAG_WEIGHT[tag] ?? 2;
      score += weight * (0.5 + rarity * 0.15);
    }

    // Soft penalty for verses that only carry ultra-broad tags
    const onlyBroad =
      sloka.tags.length > 0 &&
      sloka.tags.every(
        (t) => t === "devotion_surrender" || t === "purpose_meaning"
      );
    if (onlyBroad && tags.length > 0) score *= 0.55;

    return { sloka, score };
  });

  scored.sort((a, b) => b.score - a.score || a.sloka.id - b.sloka.id);

  const top = scored.filter((s) => s.score > 0).slice(0, limit);
  if (top.length > 0) return top.map((s) => s.sloka);

  // Tag-aware fallbacks instead of always chapter 2
  if (tags.includes("discipline_habit") || tags.includes("attachment_desire")) {
    const keys = new Set(["2.58", "2.60", "2.61", "6.5", "6.6"]);
    const found = all.filter((s) =>
      keys.has(`${s.chapter}.${s.verse_number}`)
    );
    if (found.length) return found.slice(0, limit);
  }

  const fallbackKeys = new Set(["2.47", "2.48", "2.56", "2.3", "6.5"]);
  return all
    .filter((s) => fallbackKeys.has(`${s.chapter}.${s.verse_number}`))
    .slice(0, limit);
}
