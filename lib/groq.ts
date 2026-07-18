import type { Sloka } from "@/lib/types";
import { formatVerseRef } from "@/lib/slokas";

export const GROQ_MODEL = "qwen/qwen3.6-27b";
export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatTurn = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Strip Qwen thinking blocks; keep only user-visible reply text. */
export function stripThinkBlocks(text: string): string {
  let out = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "");
  // Truncated mid-thought (no closing tag) — drop the unfinished block
  const open = out.search(/<think>/i);
  if (open !== -1) out = out.slice(0, open);
  return out.trim();
}

export function buildMadhavSystemPrompt(
  verses: Sloka[],
  lang: "en" | "hi" = "en"
): string {
  const verseBlock = verses
    .map((v) => {
      const translation =
        lang === "hi" ? v.hindi_translation : v.english_translation;
      return `- ${formatVerseRef(v)}: ${translation}`;
    })
    .join("\n");

  const languageLine =
    lang === "hi"
      ? "Reply entirely in natural Hindi (Devanagari)."
      : "Reply in natural English.";

  return `You are Madhav — a name for Krishna — speaking the way Krishna spoke to Arjuna: direct, warm, never clinical.

The user describes a problem or feeling. You are given 3-5 retrieved verses (chapter.verse + translation), ranked by relevance.

Retrieved verses:
${verseBlock}

${languageLine}

Respond in under 150 words:
1. Briefly acknowledge what they're going through, in your own words.
2. Ground your guidance in ONE retrieved verse — name it exactly as listed above (chapter.verse) and explain what it means for their situation.
3. Give one concrete, practical suggestion.

CRITICAL: You may ONLY cite verses from the retrieved list above. Never invent chapter.verse numbers.

Never diagnose. Never claim to replace professional or medical help. If the message suggests possible crisis or self-harm, gently encourage reaching out to a trusted person or a helpline, in addition to anything else you say.

Do not include <think> tags, chain-of-thought, or hidden reasoning in your reply — only the final message to the user.`;
}

function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return apiKey;
}

async function groqRequest(body: Record<string, unknown>): Promise<Response> {
  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      ...body,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let detail = errText;
    try {
      detail = JSON.parse(errText)?.error?.message || errText;
    } catch {
      /* keep raw */
    }
    throw new Error(detail || `Groq error (${res.status})`);
  }

  return res;
}

export async function createGroqChatStream(messages: ChatTurn[]): Promise<Response> {
  return groqRequest({
    temperature: 0.6,
    max_tokens: 500,
    stream: true,
    // Qwen3 otherwise spends the budget inside <think> and returns an empty reply
    reasoning_effort: "none",
    messages,
  });
}

/** Non-stream completion — used as a fallback when the stream yields no visible text. */
export async function createGroqCompletion(messages: ChatTurn[]): Promise<string> {
  const res = await groqRequest({
    temperature: 0.6,
    max_tokens: 500,
    stream: false,
    reasoning_effort: "none",
    messages,
  });
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return stripThinkBlocks(data.choices?.[0]?.message?.content ?? "");
}

export function buildStoryPrompt(passage: Sloka[], focus: Sloka): string {
  const tags = Array.from(
    new Set(passage.flatMap((s) => s.tags.map((t) => t.replace(/_/g, " "))))
  ).join(", ");

  const verseBlock = passage
    .map((s) => {
      const mark = s.id === focus.id ? " (focus)" : "";
      return `${formatVerseRef(s)}${mark}: ${s.english_translation}`;
    })
    .join("\n");

  const span =
    passage.length === 1
      ? formatVerseRef(focus)
      : `${formatVerseRef(passage[0])}–${passage[passage.length - 1].verse_number}`;

  return `You are writing a short modern reflection (180-280 words) for a Bhagavad Gita reading app.

This is NOT a retelling of the Mahabharata or Kurukshetra. It is a contemporary scene whose emotional truth mirrors a short teaching unit from the Gita — several consecutive verses that form one idea (as teachers often explain them together).

Teaching passage ${span}:
${verseBlock}

Theme tags: ${tags}

Write the story in natural English.

Write ONE modern, relatable scenario (a student, parent, employee, etc.) whose arc reflects the FULL passage — not only the focus line in isolation. Without naming verses, quoting Sanskrit, or being preachy. End with a single quiet line that lands the teaching. Keep it under 280 words. No title.

Do not include <think> tags or chain-of-thought — only the story text.`;
}

function buildTranslateStoryPrompt(englishStory: string): string {
  return `Translate the following reflective story into natural Hindi (Devanagari).

Keep the SAME story: same characters, setting, events, and ending. Do not invent a new plot. Only change the language. No title, no preface.

Story:
${englishStory}

Do not include <think> tags or chain-of-thought — only the Hindi story text.`;
}

async function completeStory(prompt: string, temperature: number): Promise<string> {
  const res = await groqRequest({
    temperature,
    max_tokens: 900,
    stream: false,
    reasoning_effort: "none",
    messages: [{ role: "user", content: prompt }],
  });

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const story = stripThinkBlocks(data.choices?.[0]?.message?.content ?? "").trim();
  if (!story) {
    throw new Error("Groq returned an empty story");
  }
  return story;
}

/** Generate one story in English, then the same story in Hindi. */
export async function generateBilingualStory(
  passage: Sloka[],
  focus: Sloka
): Promise<{ en: string; hi: string }> {
  const verses = passage.length > 0 ? passage : [focus];
  const en = await completeStory(buildStoryPrompt(verses, focus), 0.85);
  const hi = await completeStory(buildTranslateStoryPrompt(en), 0.3);
  return { en, hi };
}

/** @deprecated Prefer generateBilingualStory — kept for any direct callers. */
export async function generateStoryText(
  sloka: Sloka,
  lang: "en" | "hi"
): Promise<string> {
  const pair = await generateBilingualStory([sloka], sloka);
  return pair[lang];
}
