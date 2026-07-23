import type { PlanetId, PlanetPosition, SignId } from "@/lib/astrology/types";

export type LalKitabDebt = {
  house: number;
  title: { en: string; hi: string };
  note: { en: string; hi: string };
  remedy: { en: string; hi: string };
  severity: "info" | "caution";
};

export type LalKitabReport = {
  /** Fixed-house style: planets placed by sign as house = signIndex+1 from Aries=1 */
  fixedHouses: Array<{
    house: number;
    sign: SignId;
    occupants: PlanetId[];
  }>;
  debts: LalKitabDebt[];
  remedies: Array<{ en: string; hi: string; sourceHouse: number }>;
};

const SIGNS: SignId[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

/** Curated house debt notes (Lal Kitab–inspired educational pack). */
const HOUSE_RULES: Array<{
  house: number;
  when: (occupants: PlanetId[], all: PlanetPosition[]) => boolean;
  title: { en: string; hi: string };
  note: { en: string; hi: string };
  remedy: { en: string; hi: string };
  severity: "info" | "caution";
}> = [
  {
    house: 1,
    when: (o) => o.includes("saturn") || o.includes("rahu"),
    title: { en: "Self & vitality pressure", hi: "स्वभाव व ऊर्जा दबाव" },
    note: {
      en: "Saturn or Rahu in the first fixed house can weigh on confidence and health habits.",
      hi: "प्रथम भाव में शनि या राहु आत्मविश्वास व स्वास्थ्य आदतों पर दबाव डाल सकते हैं।",
    },
    remedy: {
      en: "Keep a water-filled copper vessel near the head of the bed; donate black sesame on Saturdays.",
      hi: "सिरहाने के पास तांबे के बर्तन में जल रखें; शनिवार को काले तिल दान करें।",
    },
    severity: "caution",
  },
  {
    house: 2,
    when: (o) => o.includes("mars") || o.includes("ketu"),
    title: { en: "Speech & family tension", hi: "वाणी व परिवार तनाव" },
    note: {
      en: "Mars or Ketu in the second may sharpen speech or family money friction.",
      hi: "द्वितीय भाव में मंगल या केतु वाणी तीखी बना सकते हैं या पारिवारिक धन में घर्षण ला सकते हैं।",
    },
    remedy: {
      en: "Offer sweets to elders; avoid harsh words after sunset.",
      hi: "बड़ों को मिठाई अर्पित करें; सूर्यास्त के बाद कठोर वचन से बचें।",
    },
    severity: "caution",
  },
  {
    house: 4,
    when: (o) => o.includes("saturn") || o.includes("rahu"),
    title: { en: "Home & mother peace", hi: "घर व मातृ शांति" },
    note: {
      en: "Heavy planets in the fourth can unsettle domestic ease.",
      hi: "चतुर्थ भाव में भारी ग्रह घरेलू शांति को बिगाड़ सकते हैं।",
    },
    remedy: {
      en: "Keep the northeast corner clean; plant a tulsi if possible.",
      hi: "ईशान कोण स्वच्छ रखें; संभव हो तो तुलसी लगाएँ।",
    },
    severity: "info",
  },
  {
    house: 5,
    when: (o) => o.includes("rahu") || o.includes("ketu"),
    title: { en: "Children & creative focus", hi: "संतान व सृजन एकाग्रता" },
    note: {
      en: "Nodes in the fifth ask for disciplined creative and mentoring channels.",
      hi: "पंचम भाव में छाया ग्रह अनुशासित सृजन व मार्गदर्शन मांगते हैं।",
    },
    remedy: {
      en: "Support a child’s education or donate books.",
      hi: "किसी बच्चे की शिक्षा में सहयोग दें या पुस्तकें दान करें।",
    },
    severity: "info",
  },
  {
    house: 6,
    when: (o) => o.length === 0,
    title: { en: "Empty sixth — service debt", hi: "रिक्त षष्ठ — सेवा ऋण" },
    note: {
      en: "An empty sixth in this pack suggests strengthening service and health routines.",
      hi: "इस पैक में रिक्त षष्ठ सेवा व स्वास्थ्य दिनचर्या मजबूत करने का संकेत है।",
    },
    remedy: {
      en: "Serve animals or help someone dealing with illness (non-medical support).",
      hi: "पशु सेवा करें या बीमार व्यक्ति की गैर-चिकित्सकीय सहायता करें।",
    },
    severity: "info",
  },
  {
    house: 7,
    when: (o) => o.includes("saturn") || o.includes("mars"),
    title: { en: "Partnership friction", hi: "साझेदारी घर्षण" },
    note: {
      en: "Saturn or Mars in the seventh can delay or heat partnerships.",
      hi: "सप्तम में शनि या मंगल साझेदारी में विलंब या तनाव ला सकते हैं।",
    },
    remedy: {
      en: "Feed birds together with your partner when possible; keep promises small and clear.",
      hi: "संभव हो तो साथी के साथ पक्षियों को दाना दें; वादे छोटे व स्पष्ट रखें।",
    },
    severity: "caution",
  },
  {
    house: 8,
    when: (o) => o.includes("sun") || o.includes("moon"),
    title: { en: "Sudden change sensitivity", hi: "अचानक परिवर्तन संवेदनशीलता" },
    note: {
      en: "Luminaries in the eighth heighten need for emotional and financial buffers.",
      hi: "अष्टम में सूर्य/चन्द्र भावनात्मक व आर्थिक सुरक्षा की आवश्यकता बढ़ाते हैं।",
    },
    remedy: {
      en: "Avoid unnecessary loans; keep emergency savings untouched.",
      hi: "अनावश्यक ऋण से बचें; आपातकालीन बचत न छुएँ।",
    },
    severity: "caution",
  },
  {
    house: 9,
    when: (o) => o.includes("saturn") || o.includes("rahu"),
    title: { en: "Dharma & mentor distance", hi: "धर्म व गुरु दूरी" },
    note: {
      en: "Heavy influence on the ninth can distance mentors or travel for purpose.",
      hi: "नवम पर भारी प्रभाव गुरुजन या उद्देश्यपूर्ण यात्रा से दूरी बना सकता है।",
    },
    remedy: {
      en: "Touch elders’ feet respectfully; donate to a place of learning.",
      hi: "बड़ों के चरण स्पर्श करें; शिक्षा स्थल पर दान करें।",
    },
    severity: "info",
  },
  {
    house: 10,
    when: (o) => o.includes("ketu") || o.includes("rahu"),
    title: { en: "Career path pivots", hi: "करियर मार्ग मोड़" },
    note: {
      en: "Nodes on the tenth often mark unconventional career turns.",
      hi: "दशम पर छाया ग्रह अक्सर असामान्य करियर मोड़ दर्शाते हैं।",
    },
    remedy: {
      en: "Keep a steady morning work ritual; avoid job gossip.",
      hi: "सुबह की स्थिर कार्य दिनचर्या रखें; नौकरी की गपशप से बचें।",
    },
    severity: "info",
  },
  {
    house: 12,
    when: (o) => o.includes("mars") || o.includes("saturn"),
    title: { en: "Expenses & rest debt", hi: "व्यय व विश्राम ऋण" },
    note: {
      en: "Mars or Saturn in the twelfth can drain sleep or raise hidden costs.",
      hi: "द्वादश में मंगल या शनि नींद घटा सकते हैं या छिपे खर्च बढ़ा सकते हैं।",
    },
    remedy: {
      en: "Sleep before midnight; donate blankets or footwear once a month.",
      hi: "आधी रात से पहले सोएँ; माह में एक बार कंबल या जूते दान करें।",
    },
    severity: "caution",
  },
];

/**
 * Lal Kitab–style fixed house chart (Aries = house 1) + curated debts/remedies.
 * Kept separate from Vedic/KP blend — educational, not predictive prose.
 */
export function buildLalKitabReport(planets: PlanetPosition[]): LalKitabReport {
  const fixedHouses = SIGNS.map((sign, i) => {
    const house = i + 1;
    const occupants = planets
      .filter((p) => p.signIndex === i && p.id !== "ascendant")
      .map((p) => p.id);
    return { house, sign, occupants };
  });

  const debts: LalKitabDebt[] = [];
  for (const rule of HOUSE_RULES) {
    const row = fixedHouses.find((h) => h.house === rule.house)!;
    if (rule.when(row.occupants, planets)) {
      debts.push({
        house: rule.house,
        title: rule.title,
        note: rule.note,
        remedy: rule.remedy,
        severity: rule.severity,
      });
    }
  }

  // Always offer 1–2 general remedies if few debts matched
  if (debts.length < 2) {
    debts.push({
      house: 0,
      title: { en: "General balance", hi: "सामान्य संतुलन" },
      note: {
        en: "Keep speech soft at home and finances transparent — core Lal Kitab hygiene.",
        hi: "घर में मृदु वाणी व पारदर्शी वित्त — मूल लाल किताब अनुशासन।",
      },
      remedy: {
        en: "Feed a street dog or bird daily for 43 days when possible.",
        hi: "संभव हो तो ४३ दिन तक रोज़ सड़क के कुत्ते या पक्षी को खिलाएँ।",
      },
      severity: "info",
    });
  }

  const remedies = debts.map((d) => ({
    ...d.remedy,
    sourceHouse: d.house,
  }));

  return { fixedHouses, debts, remedies };
}
