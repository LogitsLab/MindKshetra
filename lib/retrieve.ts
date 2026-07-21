import { dbVectorSearch } from "@/lib/content/db";
import { isDbContentEnabled } from "@/lib/content/source";
import { embedText, embeddingsEnabled } from "@/lib/embeddings";
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

const TAG_WEIGHT: Record<string, number> = {
  devotion_surrender: 1.1,
  purpose_meaning: 0.7,
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
  anxiety_fear: ["anxious", "anxiety", "afraid", "fear", "scared", "worried", "worry", "nervous", "panic", "terrified"],
  grief_loss: ["grief", "grieving", "loss", "lost", "death", "died", "mourn", "sad", "sorrow", "cry", "crying"],
  anger: ["angry", "anger", "rage", "furious", "mad", "irritated", "resent", "exploding"],
  confusion_decision: ["confused", "confusion", "decision", "decide", "unsure", "stuck", "dilemma", "choice", "choose"],
  overwhelm_burnout: ["overwhelmed", "overwhelm", "burnout", "burned", "exhausted", "stressed", "stress"],
  loneliness: ["lonely", "alone", "isolated", "isolation", "nobody"],
  guilt: ["guilt", "guilty", "ashamed", "shame", "regret", "mistake"],
  jealousy_comparison: ["jealous", "jealousy", "envy", "compare", "comparison", "unfair", "successful"],
  low_self_worth: ["failure", "fail", "worthless", "inadequate", "useless"],
  duty_responsibility: ["duty", "responsibility", "work", "job", "obligation", "should"],
  purpose_meaning: ["purpose", "meaning", "direction", "pointless", "life"],
  attachment_desire: ["desire", "want", "craving", "attached", "attachment", "obsess", "addiction"],
  detachment: ["let go", "letting go", "detach", "release"],
  courage: ["courage", "brave", "stand up", "strength"],
  equanimity: ["calm", "peace", "balance", "steady"],
  control_of_mind: ["mind", "thoughts", "racing", "focus", "distract", "meditation"],
  success_ambition: ["success", "ambition", "career", "win", "achieve", "goal"],
  relationships_conflict: ["conflict", "fight", "argument", "relationship", "partner", "family", "fighting"],
  gratitude_contentment: ["grateful", "gratitude", "thankful", "content", "happy", "joy"],
  devotion_surrender: ["faith", "pray", "god", "surrender", "devote"],
  action_without_attachment: ["result", "outcome", "fruit", "expect", "results"],
  impermanence_mortality: ["death", "dying", "change", "impermanent", "mortal", "temporary"],
  discipline_habit: ["habit", "discipline", "routine", "practice", "lazy", "habits"],
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
  const hindi = (text.match(/[\u0900-\u097F]{2,}/g) || []).map((w) =>
    w.toLowerCase()
  );
  return Array.from(new Set(latin.concat(hindi)));
}

function inferredTags(query: string): string[] {
  const lower = query.toLowerCase();
  const hits: string[] = [];
  for (const [tag, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) hits.push(tag);
  }
  return hits;
}

export function buildRetrievalQuery(messages: ChatMessage[]): string {
  const userTurns = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);
  if (userTurns.length === 0) return "";
  const latest = userTurns[userTurns.length - 1];
  const earlier = userTurns.slice(-3, -1).join(" ");
  return `${latest} ${latest} ${earlier}`.trim();
}

async function tagScoreSlokas(
  query: string,
  all: Sloka[],
  limit: number
): Promise<Array<{ sloka: Sloka; score: number }>> {
  const tokens = tokenize(query);
  const tags = inferredTags(query);
  const tagSet = new Set(tags);
  const tagFreq = new Map<string, number>();
  for (const s of all) {
    for (const t of s.tags) tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
  }

  return all
    .map((sloka) => {
      let score = 0;
      const translationHay = [
        sloka.english_translation,
        sloka.hindi_translation,
        sloka.english_meaning ?? "",
        sloka.hindi_meaning ?? "",
        ...sloka.tags.map((t) => t.replace(/_/g, " ")),
      ]
        .join(" ")
        .toLowerCase();

      for (const token of tokens) {
        if (translationHay.includes(token)) score += 1.8;
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

      const onlyBroad =
        sloka.tags.length > 0 &&
        sloka.tags.every(
          (t) => t === "devotion_surrender" || t === "purpose_meaning"
        );
      if (onlyBroad && tags.length > 0) score *= 0.55;

      return { sloka, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.sloka.id - b.sloka.id)
    .slice(0, limit);
}

function diversifiedFallbacks(
  query: string,
  tags: string[],
  all: Sloka[],
  limit: number
): Sloka[] {
  const FALLBACKS: Array<{ tags: string[]; keys: string[] }> = [
    { tags: ["discipline_habit", "attachment_desire"], keys: ["2.58", "2.60", "2.61", "6.5", "6.6"] },
    { tags: ["grief_loss", "loneliness"], keys: ["2.11", "2.13", "2.14", "2.27", "12.13"] },
    { tags: ["anxiety_fear", "hope"], keys: ["2.3", "2.7", "18.66", "11.33", "6.5"] },
    { tags: ["anger", "relationships_conflict"], keys: ["2.62", "2.63", "16.21", "2.56", "5.23"] },
    { tags: ["low_self_worth", "unmotivated", "courage"], keys: ["2.3", "2.37", "6.5", "9.30", "18.58"] },
  ];

  for (const fb of FALLBACKS) {
    if (fb.tags.some((t) => tags.includes(t))) {
      const keys = new Set(fb.keys);
      const found = all.filter((s) =>
        keys.has(`${s.chapter}.${s.verse_number}`)
      );
      if (found.length) return found.slice(0, limit);
    }
  }

  const pools = [
    ["2.47", "2.48", "2.56", "2.3", "6.5"],
    ["18.66", "9.22", "9.30", "12.13", "2.14"],
    ["3.19", "3.30", "4.18", "5.10", "6.26"],
  ];
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash + query.charCodeAt(i) * (i + 1)) % 997;
  }
  const pool = pools[hash % pools.length];
  const fallbackKeys = new Set(pool);
  return all
    .filter((s) => fallbackKeys.has(`${s.chapter}.${s.verse_number}`))
    .slice(0, limit);
}

export async function retrieveSlokas(
  query: string,
  limit = 5
): Promise<Sloka[]> {
  const all = await getAllSlokas();
  const tags = inferredTags(query);
  const merged = new Map<number, { sloka: Sloka; score: number }>();

  const tagResults = await tagScoreSlokas(query, all, limit * 2);
  for (const { sloka, score } of tagResults) {
    merged.set(sloka.id, {
      sloka,
      score: (merged.get(sloka.id)?.score ?? 0) + score * 0.3,
    });
  }

  if (isDbContentEnabled() && embeddingsEnabled()) {
    try {
      const embedding = await embedText(query);
      if (embedding) {
        const vectorHits = await dbVectorSearch(embedding, limit * 2);
        for (const { sloka, similarity } of vectorHits) {
          const prev = merged.get(sloka.id);
          merged.set(sloka.id, {
            sloka,
            score: (prev?.score ?? 0) + similarity * 0.7 * 10,
          });
        }
      }
    } catch (err) {
      console.warn("[retrieve] vector search failed", err);
    }
  }

  const ranked = Array.from(merged.values())
    .sort((a, b) => b.score - a.score || a.sloka.id - b.sloka.id)
    .slice(0, limit);

  if (ranked.length > 0) return ranked.map((r) => r.sloka);

  const tagOnly = tagResults.map((r) => r.sloka);
  if (tagOnly.length > 0) return tagOnly.slice(0, limit);

  return diversifiedFallbacks(query, tags, all, limit);
}
