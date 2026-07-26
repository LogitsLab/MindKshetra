import type { ChartPayload } from "@/lib/astrology/types";
import type { Sloka } from "@/lib/types";
import { buildMadhavSystemPrompt } from "@/lib/groq";
import { buildChartChatContext } from "@/lib/astrology/blend";

/**
 * Two-voice reply — prompt construction.
 *
 *   user message ──┬──▶ READING call   temp 0.4  max_tokens 220  (chart guide)
 *                  └──▶ TEACHING call  temp 0.7  max_tokens 900  (Madhav)
 *                         both stream in parallel, rendered as two blocks
 *
 * TWO CALLS, NOT ONE (eng decision 10). A single call cannot work here:
 *
 *   - temperature. The chart voice runs at 0.4 precisely because inventing a
 *     planet position is unacceptable; Madhav runs at 0.7 for warmth. One call
 *     must pick one number, and either choice degrades a voice.
 *   - self-contradiction. lib/groq.ts:90 tells Madhav "NEVER use section labels
 *     or report-style headings", with a forbidden-examples list. A merged prompt
 *     asking for two labelled sections argues with itself.
 *   - truncation. Combined output plausibly exceeds max_tokens, and a tag-based
 *     splitter would then lose the closing tag and silently drop a whole voice.
 *   - failure isolation. Independent calls mean a failed chart voice degrades to
 *     Gita-only instead of corrupting the entire reply.
 *
 * LABELS ARE NOT IN THESE PROMPTS. The UI renders "Madhav" and the chart
 * epigraph as chrome. That respects the no-headings rule above, keeps each
 * prompt single-purpose, and makes an empty labelled block impossible: a voice
 * with no content renders no label.
 */

/**
 * des/D1 — the chart voice is capped at 1-2 sentences.
 *
 * buildAstrologyChatSystemPrompt mandates "2-4 short paragraphs" at 1100 tokens,
 * which is right for the dedicated chart page and wrong for a chat epigraph. The
 * approved design renders this as a single serif line above the teaching; three
 * paragraphs there would be unreadable and would push the teaching off screen.
 *
 * Enforced in BOTH places on purpose: the instruction below, and max_tokens as a
 * hard ceiling. Prompts are requests, not guarantees.
 */
export const READING_MAX_TOKENS = 220;
export const READING_TEMPERATURE = 0.4;
export const TEACHING_TEMPERATURE = 0.7;
export const TEACHING_MAX_TOKENS = 900;

export function buildReadingPrompt(
  chart: ChartPayload,
  language: "en" | "hi"
): string {
  const context = buildChartChatContext(chart);
  const langBlock =
    language === "hi"
      ? "भाषा: पूरी तरह स्वाभाविक हिन्दी (देवनागरी) में उत्तर दें।"
      : "LANGUAGE: reply in warm, clear English.";

  return `You are MindKshetra's chart reader. You state what this specific birth chart is carrying right now.

${langBlock}

LENGTH — THIS IS THE HARD RULE:
Reply with ONE or TWO sentences. Never more. No paragraphs, no lists, no headings,
no preamble, no sign-off. If you cannot say it in two sentences, say less.

SHAPE:
Name the placement or period that matters, and what it asks of the person.
Example shape (do not copy the words): "Saturn holds your tenth house until March
2028 — this asks for endurance rather than speed."

RULES:
- Use ONLY the chart facts below. Never invent planets, houses, degrees, yogas or
  dasha dates. If a fact is not listed, it does not exist.
- Report date is ${chart.asOfDate}. Do not invent other year phrases.
- Never name competing schools (Vedic/KP/etc).
- Health: vitality language only. No diagnosis. No death predictions. No
  catastrophic claims.
- No filler ("the stars say", "cosmic energy", "trust the journey").
- Do NOT give advice — the next voice does that. You describe the weather, not
  what to wear.
- Do NOT write a label, heading or title of any kind. The interface adds those.

CHART FACTS:
${context}`;
}

/**
 * The teaching voice is Madhav, unchanged. The chart reading is passed as
 * CONTEXT so the teaching can respond to it, but the persona, the verse
 * grounding and the crisis-safety language all stay exactly as they are.
 */
export function buildTeachingPrompt(
  verses: Sloka[],
  language: "en" | "hi",
  reading?: string | null
): string {
  const base = buildMadhavSystemPrompt(verses, language);
  if (!reading || !reading.trim()) return base;

  return `${base}

CONTEXT FROM THIS PERSON'S BIRTH CHART (already shown to them above your reply):
"${reading.trim()}"

Let it inform what you say — you may speak to the pressure it names — but do NOT
repeat it, do NOT quote it, and do NOT mention planets, houses or dasha periods
yourself. That voice has already spoken. You are the teaching that follows it.`;
}
