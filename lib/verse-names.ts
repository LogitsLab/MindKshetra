/**
 * Popular names of widely quoted verses, keyed "chapter.verse".
 *
 * People search famous verses by their opening words far more than by
 * reference ("karmanye vadhikaraste meaning" vs "bhagavad gita 2.47"), and no
 * title, heading or description on the site carried those words. Spellings
 * follow common popular romanisation, not strict IAST, because that is what
 * people type. Each entry was checked against the verse's IAST in
 * data/slokas.json (test/verse-names.test.ts guards the keys).
 *
 * Verses not listed here keep reference-only titles: a mechanical "first two
 * words" fallback produces fragments nobody searches for.
 */
export const VERSE_POPULAR_NAMES: Readonly<Record<string, string>> = {
  "1.1": "Dharmakshetre Kurukshetre",
  "2.7": "Karpanya Dosha",
  "2.11": "Ashochyan Anvashochas Tvam",
  "2.12": "Na Tvevaham Jatu Nasam",
  "2.13": "Dehino'smin Yatha Dehe",
  "2.14": "Matra Sparshas Tu Kaunteya",
  "2.19": "Ya Enam Vetti Hantaram",
  "2.20": "Na Jayate Mriyate Va",
  "2.22": "Vasamsi Jirnani Yatha Vihaya",
  "2.23": "Nainam Chhindanti Shastrani",
  "2.27": "Jatasya Hi Dhruvo Mrityur",
  "2.38": "Sukha Duhkhe Same Kritva",
  "2.47": "Karmanye Vadhikaraste",
  "2.48": "Yogasthah Kuru Karmani",
  "2.50": "Yogah Karmasu Kaushalam",
  "2.56": "Duhkheshv Anudvigna Manah",
  "2.62": "Dhyayato Vishayan Pumsah",
  "2.63": "Krodhad Bhavati Sammohah",
  "2.70": "Apuryamanam Achala",
  "3.8": "Niyatam Kuru Karma Tvam",
  "3.19": "Tasmad Asaktah Satatam",
  "3.21": "Yad Yad Acharati Shreshthah",
  "3.27": "Prakriteh Kriyamanani",
  "3.35": "Shreyan Svadharmo Vigunah",
  "3.37": "Kama Esha Krodha Esha",
  "4.7": "Yada Yada Hi Dharmasya",
  "4.8": "Paritranaya Sadhunam",
  "4.11": "Ye Yatha Mam Prapadyante",
  "4.34": "Tad Viddhi Pranipatena",
  "4.38": "Na Hi Jnanena Sadrisham",
  "4.39": "Shraddhavan Labhate Jnanam",
  "5.18": "Vidya Vinaya Sampanne",
  "6.5": "Uddhared Atmanatmanam",
  "6.6": "Bandhur Atmatmanas Tasya",
  "6.17": "Yuktahara Viharasya",
  "6.26": "Yato Yato Nishcharati",
  "6.35": "Asanshayam Mahabaho",
  "7.19": "Bahunam Janmanam Ante",
  "8.5": "Anta Kale Cha Mam Eva",
  "9.22": "Ananyash Chintayanto Mam",
  "9.26": "Patram Pushpam Phalam Toyam",
  "9.27": "Yat Karoshi Yad Ashnasi",
  "9.34": "Man Mana Bhava Mad Bhakto",
  "10.20": "Aham Atma Gudakesha",
  "11.32": "Kalo'smi Loka Kshaya Krit",
  "12.13": "Adveshta Sarva Bhutanam",
  "15.7": "Mamaivamsho Jiva Loke",
  "15.15": "Sarvasya Chaham Hridi",
  "16.21": "Tri Vidham Narakasyedam",
  "18.46": "Yatah Pravrittir Bhutanam",
  "18.65": "Man Mana Bhava Mad Bhakto",
  "18.66": "Sarva Dharman Parityajya",
  "18.78": "Yatra Yogeshvarah Krishnah",
};

export function versePopularName(
  chapter: number,
  verse: number
): string | undefined {
  return VERSE_POPULAR_NAMES[`${chapter}.${verse}`];
}
