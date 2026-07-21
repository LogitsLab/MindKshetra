const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3";

export function embeddingsEnabled(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY?.trim());
}

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.VOYAGE_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [text.slice(0, 8000)],
      model: MODEL,
      input_type: "query",
    }),
  });

  if (!res.ok) {
    console.warn("[embeddings] Voyage error", res.status);
    return null;
  }

  const data = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  return data.data?.[0]?.embedding ?? null;
}

export function buildSlokaEmbedText(sloka: {
  chapter: number;
  verse_number: number;
  english_translation: string;
  hindi_translation: string;
  tags: string[];
}): string {
  const ref = `${sloka.chapter}.${sloka.verse_number}`;
  const tags = sloka.tags.map((t) => t.replace(/_/g, " ")).join(", ");
  return `${ref} | ${sloka.english_translation} | ${sloka.hindi_translation} | ${tags}`;
}
