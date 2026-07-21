import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Mood, Sloka } from "@/lib/types";

type DbSlokaRow = {
  id: number;
  chapter: number;
  verse_number: number;
  sanskrit_devanagari: string;
  transliteration_iast: string;
  hindi_translation: string;
  english_translation: string;
  english_meaning: string | null;
  hindi_meaning: string | null;
  word_meanings: Record<string, string> | null;
  sloka_tags?: { tags: { name: string } | null }[];
};

function mapRow(row: DbSlokaRow): Sloka {
  const tags =
    row.sloka_tags
      ?.map((st) => st.tags?.name)
      .filter((t): t is string => Boolean(t)) ?? [];
  return {
    id: row.id,
    chapter: row.chapter,
    verse_number: row.verse_number,
    sanskrit_devanagari: row.sanskrit_devanagari,
    transliteration_iast: row.transliteration_iast,
    hindi_translation: row.hindi_translation,
    english_translation: row.english_translation,
    english_meaning: row.english_meaning ?? undefined,
    hindi_meaning: row.hindi_meaning ?? undefined,
    word_meanings: row.word_meanings ?? undefined,
    tags,
  };
}

const SLOKA_SELECT = `
  id, chapter, verse_number, sanskrit_devanagari, transliteration_iast,
  hindi_translation, english_translation, english_meaning, hindi_meaning,
  word_meanings,
  sloka_tags ( tags ( name ) )
`;

async function getClient() {
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

export async function dbGetAllSlokas(): Promise<Sloka[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("slokas")
    .select(SLOKA_SELECT)
    .order("chapter")
    .order("verse_number");
  if (error) throw error;
  return (data as unknown as DbSlokaRow[]).map(mapRow);
}

export async function dbGetSlokaById(id: number): Promise<Sloka | undefined> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("slokas")
    .select(SLOKA_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as DbSlokaRow) : undefined;
}

export async function dbGetSlokasByChapter(chapter: number): Promise<Sloka[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("slokas")
    .select(SLOKA_SELECT)
    .eq("chapter", chapter)
    .order("verse_number");
  if (error) throw error;
  return (data as unknown as DbSlokaRow[]).map(mapRow);
}

export async function dbGetChapters(): Promise<number[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("slokas")
    .select("chapter")
    .order("chapter");
  if (error) throw error;
  const set = new Set((data ?? []).map((r) => r.chapter as number));
  return Array.from(set).sort((a, b) => a - b);
}

export async function dbGetSlokaByRef(
  chapter: number,
  verse: number
): Promise<Sloka | undefined> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("slokas")
    .select(SLOKA_SELECT)
    .eq("chapter", chapter)
    .eq("verse_number", verse)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as DbSlokaRow) : undefined;
}

export async function dbGetSlokasByTags(tags: string[]): Promise<Sloka[]> {
  if (tags.length === 0) return [];
  const all = await dbGetAllSlokas();
  const tagSet = new Set(tags);
  const freq = new Map<string, number>();
  for (const s of all) {
    for (const t of s.tags) freq.set(t, (freq.get(t) || 0) + 1);
  }
  return all
    .map((sloka) => {
      let score = 0;
      for (const t of sloka.tags) {
        if (!tagSet.has(t)) continue;
        const f = freq.get(t) || 1;
        score += 1 + Math.min(2.5, 200 / f);
      }
      return { sloka, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.sloka.chapter - b.sloka.chapter ||
        a.sloka.verse_number - b.sloka.verse_number
    )
    .map(({ sloka }) => sloka);
}

export async function dbGetAllMoods(): Promise<Mood[]> {
  const supabase = await getClient();
  const { data: moods, error } = await supabase
    .from("moods")
    .select("id, label, label_hi, mood_tags ( tag_name )")
    .order("sort_order");
  if (error) throw error;
  return (moods ?? []).map((m) => ({
    id: m.id as string,
    label: m.label as string,
    labelHi: m.label_hi as string,
    tags: (
      (m.mood_tags as { tag_name: string }[] | null) ?? []
    ).map((t) => t.tag_name),
  }));
}

export async function dbGetMoodById(id: string): Promise<Mood | undefined> {
  const moods = await dbGetAllMoods();
  return moods.find((m) => m.id === id);
}

export async function dbVectorSearch(
  embedding: number[],
  limit = 8
): Promise<Array<{ sloka: Sloka; similarity: number }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_slokas", {
    query_embedding: embedding,
    match_count: limit,
  });
  if (error) throw error;
  const rows = (data ?? []) as { sloka_id: number; similarity: number }[];
  const results: Array<{ sloka: Sloka; similarity: number }> = [];
  for (const row of rows) {
    const sloka = await dbGetSlokaById(row.sloka_id);
    if (sloka) results.push({ sloka, similarity: row.similarity });
  }
  return results;
}

export async function dbGetStory(
  slokaId: number,
  lang: "en" | "hi",
  variantIndex = 0
): Promise<string | null> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("stories")
    .select("story_text")
    .eq("sloka_id", slokaId)
    .eq("language", lang)
    .eq("variant_index", variantIndex)
    .maybeSingle();
  if (error) return null;
  return data?.story_text ?? null;
}

export async function dbSaveStory(
  slokaId: number,
  lang: "en" | "hi",
  text: string,
  variantIndex: number
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("stories").upsert(
    {
      sloka_id: slokaId,
      language: lang,
      story_text: text,
      variant_index: variantIndex,
    },
    { onConflict: "sloka_id,language,variant_index" }
  );
}

export async function dbCountStories(slokaId: number): Promise<number> {
  const supabase = await getClient();
  const { count, error } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("sloka_id", slokaId);
  if (error) return 0;
  return count ?? 0;
}

export type DbStoryVariant = { en: string; hi: string };

/** Load bilingual story variants for a sloka (paired by variant_index). */
export async function dbLoadStoryVariants(
  slokaId: number
): Promise<DbStoryVariant[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("stories")
    .select("language, story_text, variant_index")
    .eq("sloka_id", slokaId)
    .order("variant_index");
  if (error || !data?.length) return [];

  const byIndex = new Map<number, { en?: string; hi?: string }>();
  for (const row of data) {
    const idx = Number(row.variant_index);
    const slot = byIndex.get(idx) ?? {};
    if (row.language === "en") slot.en = row.story_text;
    if (row.language === "hi") slot.hi = row.story_text;
    byIndex.set(idx, slot);
  }

  return Array.from(byIndex.entries())
    .sort(([a], [b]) => a - b)
    .map(([, pair]) => pair)
    .filter((p): p is DbStoryVariant => Boolean(p.en?.trim() && p.hi?.trim()));
}

/** Upsert a bilingual variant pair at a given index. */
export async function dbUpsertStoryVariant(
  slokaId: number,
  variantIndex: number,
  variant: DbStoryVariant
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("stories").upsert(
    [
      {
        sloka_id: slokaId,
        language: "en",
        story_text: variant.en,
        variant_index: variantIndex,
      },
      {
        sloka_id: slokaId,
        language: "hi",
        story_text: variant.hi,
        variant_index: variantIndex,
      },
    ],
    { onConflict: "sloka_id,language,variant_index" }
  );
  if (error) throw new Error(error.message);
}

/** Replace all variants for a sloka with the given bilingual list. */
export async function dbReplaceStoryVariants(
  slokaId: number,
  variants: DbStoryVariant[]
): Promise<void> {
  const supabase = createAdminClient();
  const { error: delErr } = await supabase
    .from("stories")
    .delete()
    .eq("sloka_id", slokaId);
  if (delErr) throw new Error(delErr.message);

  if (!variants.length) return;

  const rows = variants.flatMap((v, i) => [
    {
      sloka_id: slokaId,
      language: "en" as const,
      story_text: v.en,
      variant_index: i,
    },
    {
      sloka_id: slokaId,
      language: "hi" as const,
      story_text: v.hi,
      variant_index: i,
    },
  ]);

  const { error } = await supabase.from("stories").upsert(rows, {
    onConflict: "sloka_id,language,variant_index",
  });
  if (error) throw new Error(error.message);
}

