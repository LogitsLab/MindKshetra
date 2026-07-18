export type Sloka = {
  id: number;
  chapter: number;
  verse_number: number;
  sanskrit_devanagari: string;
  transliteration_iast: string;
  hindi_translation: string;
  english_translation: string;
  /** Verse purport / meaning (not word-by-word glosses). */
  english_meaning?: string;
  hindi_meaning?: string;
  word_meanings?: Record<string, string>;
  tags: string[];
};

export type Mood = {
  id: string;
  label: string;
  labelHi: string;
  tags: string[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
