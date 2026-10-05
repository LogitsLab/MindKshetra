import sources from "@/data/commentary-sources.json";

/**
 * Who actually wrote each verse text field.
 *
 * Every English commentary used to carry one static credit, "After Swami
 * Sivananda", and every Hindi commentary "based on Swami Ramsukhdas" — but
 * the corpus mixes sources (the QA script falls back to Prabhupada's purports
 * where Sivananda's text was unusable, and the Hindi commentary is
 * Chinmayananda's). On a scripture site a wrong credit is a factual error,
 * and for copyrighted texts it is also a licensing one. data/commentary-
 * sources.json records the verified source per field; this turns it into
 * credit lines.
 */
export type SourceId =
  | "sivananda"
  | "prabhupada"
  | "chinmayananda"
  | "ramsukhdas"
  | "tejomayananda"
  | "unknown";

type Field =
  | "english_meaning"
  | "hindi_meaning"
  | "english_translation"
  | "hindi_translation";

type SourcesFile = {
  defaults: Partial<Record<Field, SourceId | null>>;
  overrides: Record<string, Partial<Record<Field, SourceId | null>>>;
};

const data = sources as SourcesFile;

const AUTHOR: Record<Exclude<SourceId, "unknown">, { en: string; hi: string }> = {
  sivananda: { en: "Swami Sivananda", hi: "स्वामी शिवानन्द" },
  prabhupada: {
    en: "A.C. Bhaktivedanta Swami Prabhupada",
    hi: "ए.सी. भक्तिवेदान्त स्वामी प्रभुपाद",
  },
  chinmayananda: { en: "Swami Chinmayananda", hi: "स्वामी चिन्मयानन्द" },
  ramsukhdas: { en: "Swami Ramsukhdas", hi: "स्वामी रामसुखदास" },
  tejomayananda: { en: "Swami Tejomayananda", hi: "स्वामी तेजोमयानन्द" },
};

export function verseSource(
  chapter: number,
  verse: number,
  field: Field
): SourceId {
  const override = data.overrides[`${chapter}.${verse}`]?.[field];
  return override ?? data.defaults[field] ?? "unknown";
}

function author(id: SourceId) {
  return id === "unknown" ? null : AUTHOR[id];
}

export type VerseCredits = {
  /** Shown under the English commentary, in English. */
  englishCommentary: string;
  /** Shown under the Hindi commentary, in Hindi. */
  hindiCommentary: string;
  /** Translator names for structured data; null when unverified. */
  englishTranslation: string | null;
  hindiTranslation: string | null;
};

export function verseCredits(chapter: number, verse: number): VerseCredits {
  const enMeaning = author(verseSource(chapter, verse, "english_meaning"));
  const hiMeaning = author(verseSource(chapter, verse, "hindi_meaning"));
  return {
    englishCommentary: enMeaning
      ? `After ${enMeaning.en}`
      : "Traditional commentary",
    hindiCommentary: hiMeaning
      ? `${hiMeaning.hi} के भाष्य पर आधारित`
      : "पारम्परिक भाष्य",
    englishTranslation:
      author(verseSource(chapter, verse, "english_translation"))?.en ?? null,
    hindiTranslation:
      author(verseSource(chapter, verse, "hindi_translation"))?.en ?? null,
  };
}
