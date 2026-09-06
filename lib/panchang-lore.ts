import lore from "@/data/panchang-lore.json";

export type LoreBlurb = { en: string; hi: string };

type LoreFile = {
  tithi: Record<string, LoreBlurb>;
  nakshatra: Record<string, LoreBlurb>;
  vaar: Record<string, LoreBlurb>;
  specials: Record<string, LoreBlurb>;
};

const data = lore as LoreFile;

const TITHI_NAMES = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Purnima",
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Amavasya",
];

export type PanchangLoreInput = {
  tithiIndex: number;
  nakshatra: string;
  vaar: string;
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
};

export type DayLore = {
  tithi: LoreBlurb | null;
  nakshatra: LoreBlurb | null;
  vaar: LoreBlurb | null;
  special: LoreBlurb | null;
};

export function loreForPanchang(p: PanchangLoreInput): DayLore {
  const tithiName = TITHI_NAMES[p.tithiIndex] ?? "";
  let special: LoreBlurb | null = null;
  if (p.isEkadashi) special = data.specials.ekadashi ?? null;
  else if (p.isPurnima) special = data.specials.purnima ?? null;
  else if (p.isAmavasya) special = data.specials.amavasya ?? null;
  return {
    tithi: (tithiName && data.tithi[tithiName]) || null,
    nakshatra: data.nakshatra[p.nakshatra] ?? null,
    vaar: data.vaar[p.vaar] ?? null,
    special,
  };
}

export function pickBlurb(blurb: LoreBlurb | null, lang: "en" | "hi"): string {
  if (!blurb) return "";
  return lang === "hi" ? blurb.hi : blurb.en;
}
