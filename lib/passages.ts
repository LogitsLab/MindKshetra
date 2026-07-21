/**
 * Curated Bhagavad Gita teaching units.
 * Verses are taught in clusters; a modern story (or scene note) is shared
 * across every verse in a unit so single setup/narrative lines are not forced
 * into thin allegories.
 */

export type PassageMode = "teaching" | "scene";

export type PassageUnit = {
  /** Stable id, e.g. "2.47-53" */
  id: string;
  chapter: number;
  from: number;
  to: number;
  mode: PassageMode;
  titleEn: string;
  titleHi: string;
  /** Emotional / life theme for story generation */
  themeEn: string;
  themeHi: string;
  /**
   * For scene-mode units (battlefield setup, vision, closing frame):
   * fixed bilingual notes — not modern parables.
   */
  sceneEn?: string;
  sceneHi?: string;
};

/** Inclusive verse ranges; must cover every verse in chapters 1–18 with no gaps. */
export const PASSAGE_UNITS: PassageUnit[] = [
  // —— Chapter 1 ——
  {
    id: "1.1-27",
    chapter: 1,
    from: 1,
    to: 27,
    mode: "scene",
    titleEn: "The field is set",
    titleHi: "क्षेत्र तैयार है",
    themeEn: "Standing at the edge of a conflict you did not choose",
    themeHi: "एक ऐसे संघर्ष के किनारे जहाँ आपने चुनाव नहीं किया",
    sceneEn:
      "This opening is not a life tip — it is a stage direction. Two armies face each other on a field named for dharma. A blind king asks what is happening; a charioteer places Arjuna between the lines so he can see who he must fight.\n\nIf this verse feels thin as personal advice, that is because it is meant to be thin: it is the setup before the crisis. The Gita’s real teaching begins when Arjuna’s heart breaks open in the verses that follow.\n\nStay with the scene. Notice how conflict becomes visible only when you are willing to look at both sides — including the people you love on the other line.",
    sceneHi:
      "यह आरंभ कोई जीवन-सूत्र नहीं — मंच की तैयारी है। दो सेनाएँ धर्म के नाम वाले मैदान पर आमने-सामने हैं। एक अंधा राजा पूछता है कि क्या हो रहा है; सारथि अर्जुन को बीच में लाकर खड़ा करता है ताकि वह देख सके कि उसे किससे लड़ना है।\n\nयदि यह श्लोक व्यक्तिगत सलाह जैसा कमज़ोर लगे, तो ठीक है — यह संकट से पहले का दृश्य है। गीता की असली शिक्षा तब शुरू होती है जब आगे के श्लोकों में अर्जुन का हृदय टूटता है।\n\nदृश्य के साथ रहें। ध्यान दें — संघर्ष तब साफ़ दिखता है जब आप दोनों पक्षों को देखने को तैयार हों, उनमें वे लोग भी जिन्हें आप प्रेम करते हैं।",
  },
  {
    id: "1.28-47",
    chapter: 1,
    from: 28,
    to: 47,
    mode: "teaching",
    titleEn: "When the body freezes",
    titleHi: "जब शरीर थम जाए",
    themeEn:
      "Overwhelm, grief, and the moment you want to drop everything and walk away",
    themeHi: "अभिभूत होना, शोक, और वह क्षण जब सब छोड़कर जाना चाहो",
  },

  // —— Chapter 2 ——
  {
    id: "2.1-10",
    chapter: 2,
    from: 1,
    to: 10,
    mode: "scene",
    titleEn: "Krishna turns to face him",
    titleHi: "कृष्ण मुड़कर देखते हैं",
    themeEn: "Being met with compassion when you fall apart",
    themeHi: "जब आप टूट जाएँ तब करुणा से मिला जाना",
    sceneEn:
      "Arjuna has collapsed. Eyes full of tears, he says he will not fight. Krishna does not yet lecture — first he sees him, names the despair, and lets Arjuna speak until the words run out: “I am your student. Teach me.”\n\nThis stretch is the hinge of the Gita: the warrior becomes a seeker. Before any philosophy, there is honesty about paralysis.\n\nIf you are in a season where you cannot “perform,” these verses honor that pause. Guidance only lands after you admit you need it.",
    sceneHi:
      "अर्जुन ढह चुके हैं। आँखों में आँसू लेकर कहते हैं कि वे नहीं लड़ेंगे। कृष्ण अभी उपदेश नहीं देते — पहले देखते हैं, शोक को नाम देते हैं, और अर्जुन को बोलने देते हैं जब तक शब्द समाप्त न हों: «मैं आपका शिष्य हूँ। मुझे सिखाएँ।»\n\nयह खंड गीता का कब्जा है: योद्धा साधक बनता है। किसी दर्शन से पहले, पक्षाघात की ईमानदारी है।\n\nयदि आप ऐसे समय में हैं जहाँ «प्रदर्शन» संभव नहीं, ये श्लोक उस ठहराव को सम्मान देते हैं। मार्गदर्शन तभी बैठता है जब आप मान लें कि आपको उसकी ज़रूरत है।",
  },
  {
    id: "2.11-30",
    chapter: 2,
    from: 11,
    to: 30,
    mode: "teaching",
    titleEn: "You are more than this body",
    titleHi: "आप केवल यह शरीर नहीं",
    themeEn: "Grief, change, and remembering what does not die with roles or loss",
    themeHi: "शोक, परिवर्तन, और याद रखना कि भूमिकाओं या हानि के साथ सब नहीं मरता",
  },
  {
    id: "2.31-38",
    chapter: 2,
    from: 31,
    to: 38,
    mode: "teaching",
    titleEn: "Duty when you are afraid",
    titleHi: "भय में भी कर्तव्य",
    themeEn: "Doing the hard right thing when fear and shame pull you away",
    themeHi: "जब भय और लज्जा खींचें तब भी कठिन सही काम करना",
  },
  {
    id: "2.39-46",
    chapter: 2,
    from: 39,
    to: 46,
    mode: "teaching",
    titleEn: "A clearer mind for action",
    titleHi: "कर्म के लिए स्वच्छ बुद्धि",
    themeEn: "Quieting restless wanting so you can choose with steadiness",
    themeHi: "बेचैन चाहत शांत करके स्थिरता से चुनना",
  },
  {
    id: "2.47-53",
    chapter: 2,
    from: 47,
    to: 53,
    mode: "teaching",
    titleEn: "Act without clinging to the fruit",
    titleHi: "फल की आसक्ति छोड़कर कर्म",
    themeEn:
      "Showing up fully for the work while releasing obsession with outcomes, praise, and control",
    themeHi: "काम में पूरा उतरना, परिणाम-प्रशंसा-नियंत्रण की आसक्ति छोड़ना",
  },
  {
    id: "2.54-72",
    chapter: 2,
    from: 54,
    to: 72,
    mode: "teaching",
    titleEn: "A steady mind in a noisy world",
    titleHi: "शोर भरी दुनिया में स्थिर मन",
    themeEn: "Staying centered amid desire, anger, and constant distraction",
    themeHi: "कामना, क्रोध और निरंतर विचलन के बीच केंद्रित रहना",
  },

  // —— Chapter 3 ——
  {
    id: "3.1-9",
    chapter: 3,
    from: 1,
    to: 9,
    mode: "teaching",
    titleEn: "Why act at all",
    titleHi: "कर्म क्यों करें",
    themeEn: "When you want to withdraw, and why honest action still matters",
    themeHi: "जब पीछे हटना चाहो, और ईमानदार कर्म फिर भी क्यों ज़रूरी है",
  },
  {
    id: "3.10-16",
    chapter: 3,
    from: 10,
    to: 16,
    mode: "teaching",
    titleEn: "Work as offering",
    titleHi: "कर्म को अर्पण की तरह",
    themeEn: "Seeing your daily work as part of a larger give-and-take, not only self-gain",
    themeHi: "दैनिक काम को केवल स्वार्थ नहीं, बड़े आदान-प्रदान का अंश देखना",
  },
  {
    id: "3.17-29",
    chapter: 3,
    from: 17,
    to: 29,
    mode: "teaching",
    titleEn: "Lead by how you live",
    titleHi: "जैसे जियो वैसे मार्ग दिखाओ",
    themeEn: "Responsibility to others through your example, without pride",
    themeHi: "गर्व के बिना अपने आचरण से दूसरों के प्रति उत्तरदायित्व",
  },
  {
    id: "3.30-35",
    chapter: 3,
    from: 30,
    to: 35,
    mode: "teaching",
    titleEn: "Your work, not someone else’s",
    titleHi: "अपना कर्म, पराया नहीं",
    themeEn: "Comparing careers and paths — finding peace in your own honest lane",
    themeHi: "करियर और मार्ग की तुलना — अपने ईमानदार मार्ग में शांति",
  },
  {
    id: "3.36-43",
    chapter: 3,
    from: 36,
    to: 43,
    mode: "teaching",
    titleEn: "Desire as the inner enemy",
    titleHi: "कामना — भीतर का शत्रु",
    themeEn: "Recognizing craving and anger as the force that hijacks good intentions",
    themeHi: "अच्छे इरादों का अपहरण करने वाली तृष्णा और क्रोध को पहचानना",
  },

  // —— Chapter 4 ——
  {
    id: "4.1-15",
    chapter: 4,
    from: 1,
    to: 15,
    mode: "teaching",
    titleEn: "Wisdom that returns in every age",
    titleHi: "हर युग में लौटती ज्ञान-परंपरा",
    themeEn: "Feeling lost in chaos and remembering there is a living thread of guidance",
    themeHi: "अराजकता में खो जाना और मार्गदर्शन की जीवित डोर याद रखना",
  },
  {
    id: "4.16-23",
    chapter: 4,
    from: 16,
    to: 23,
    mode: "teaching",
    titleEn: "What counts as real action",
    titleHi: "असली कर्म क्या है",
    themeEn: "Confusing busywork with meaningful action — and acting without ego sticky",
    themeHi: "व्यस्तता को अर्थपूर्ण कर्म समझना — और अहंकार चिपकाए बिना करना",
  },
  {
    id: "4.24-33",
    chapter: 4,
    from: 24,
    to: 33,
    mode: "teaching",
    titleEn: "Every act can be sacred",
    titleHi: "हर कर्म पवित्र हो सकता है",
    themeEn: "Finding reverence in ordinary work, study, and self-discipline",
    themeHi: "साधारण काम, अध्ययन और अनुशासन में श्रद्धा पाना",
  },
  {
    id: "4.34-42",
    chapter: 4,
    from: 34,
    to: 42,
    mode: "teaching",
    titleEn: "Knowledge that cuts doubt",
    titleHi: "संदेह काटने वाला ज्ञान",
    themeEn: "Doubt that freezes you — and the clarity that comes from sincere learning",
    themeHi: "जमा देने वाला संदेह — और सच्ची सीख से आने वाली स्पष्टता",
  },

  // —— Chapter 5 ——
  {
    id: "5.1-12",
    chapter: 5,
    from: 1,
    to: 12,
    mode: "teaching",
    titleEn: "Renounce the clinging, not the work",
    titleHi: "काम नहीं, आसक्ति छोड़ो",
    themeEn: "Wanting to quit everything vs staying engaged without inner bondage",
    themeHi: "सब छोड़ देने की चाह बनाम बिना बंधन के जुड़ा रहना",
  },
  {
    id: "5.13-29",
    chapter: 5,
    from: 13,
    to: 29,
    mode: "teaching",
    titleEn: "Peace of the one who knows",
    titleHi: "ज्ञानी की शांति",
    themeEn: "Inner quiet while the outer world keeps moving",
    themeHi: "बाहर सब चलता रहे तब भी भीतर की शांति",
  },

  // —— Chapter 6 ——
  {
    id: "6.1-9",
    chapter: 6,
    from: 1,
    to: 9,
    mode: "teaching",
    titleEn: "Who is truly a yogi",
    titleHi: "सच्चा योगी कौन",
    themeEn: "Self-mastery in daily life — friend or enemy to yourself",
    themeHi: "दैनिक जीवन में आत्म-अनुशासन — अपने मित्र या शत्रु",
  },
  {
    id: "6.10-28",
    chapter: 6,
    from: 10,
    to: 28,
    mode: "teaching",
    titleEn: "Practice sitting with the mind",
    titleHi: "मन के साथ बैठने का अभ्यास",
    themeEn: "Meditation, distraction, and gently returning again and again",
    themeHi: "ध्यान, विचलन, और बार-बार कोमलता से लौटना",
  },
  {
    id: "6.29-32",
    chapter: 6,
    from: 29,
    to: 32,
    mode: "teaching",
    titleEn: "See yourself in others",
    titleHi: "दूसरों में अपने को देखो",
    themeEn: "Empathy that softens judgment and loneliness",
    themeHi: "निर्णय और अकेलापन को कोमल बनाने वाली सहानुभूति",
  },
  {
    id: "6.33-47",
    chapter: 6,
    from: 33,
    to: 47,
    mode: "teaching",
    titleEn: "When the mind will not stay",
    titleHi: "जब मन टिकता नहीं",
    themeEn: "Feeling you are failing at discipline — and Krishna’s reassurance that effort is never wasted",
    themeHi: "अनुशासन में असफलता का भाव — और कृष्ण का आश्वासन कि प्रयास व्यर्थ नहीं जाता",
  },

  // —— Chapter 7 ——
  {
    id: "7.1-14",
    chapter: 7,
    from: 1,
    to: 14,
    mode: "teaching",
    titleEn: "The divine inside ordinary nature",
    titleHi: "साधारण प्रकृति में दिव्य",
    themeEn: "Seeing sacredness in the material world without getting trapped by it",
    themeHi: "भौतिक जगत में पवित्रता देखना, उसमें फँसे बिना",
  },
  {
    id: "7.15-19",
    chapter: 7,
    from: 15,
    to: 19,
    mode: "teaching",
    titleEn: "Why people seek",
    titleHi: "लोग क्यों खोजते हैं",
    themeEn: "Turning to the sacred in crisis, curiosity, or love — and the rare seeker of truth",
    themeHi: "संकट, जिज्ञासा या प्रेम में दिव्य की ओर — और सत्य का दुर्लभ खोजी",
  },
  {
    id: "7.20-30",
    chapter: 7,
    from: 20,
    to: 30,
    mode: "teaching",
    titleEn: "What you worship shapes you",
    titleHi: "जिसकी पूजा, वैसा रूप",
    themeEn: "Where your attention and devotion actually go day to day",
    themeHi: "दिन-प्रतिदिन आपका ध्यान और भक्ति वास्तव में कहाँ जाती है",
  },

  // —— Chapter 8 ——
  {
    id: "8.1-13",
    chapter: 8,
    from: 1,
    to: 13,
    mode: "teaching",
    titleEn: "What you remember at the end",
    titleHi: "अंत में क्या याद रहे",
    themeEn: "Mortality, last thoughts, and practicing presence now",
    themeHi: "मृत्युबोध, अंतिम विचार, और अभी उपस्थिति का अभ्यास",
  },
  {
    id: "8.14-22",
    chapter: 8,
    from: 14,
    to: 22,
    mode: "teaching",
    titleEn: "The path of light",
    titleHi: "प्रकाश का मार्ग",
    themeEn: "Holding a steady devotion through the seasons of a life",
    themeHi: "जीवन के मौसमों में स्थिर भक्ति रखना",
  },
  {
    id: "8.23-28",
    chapter: 8,
    from: 23,
    to: 28,
    mode: "teaching",
    titleEn: "Leaving and returning",
    titleHi: "जाना और लौटना",
    themeEn: "Cycles of beginning and ending — choosing how you depart a chapter",
    themeHi: "आरंभ-अंत के चक्र — एक अध्याय कैसे छोड़ते हैं",
  },

  // —— Chapter 9 ——
  {
    id: "9.1-10",
    chapter: 9,
    from: 1,
    to: 10,
    mode: "teaching",
    titleEn: "A royal secret, simply held",
    titleHi: "राजविद्या — सरल पकड़",
    themeEn: "Feeling unworthy of deep truth — and being invited anyway",
    themeHi: "गहरे सत्य के अयोग्य महसूस करना — फिर भी आमंत्रित होना",
  },
  {
    id: "9.11-25",
    chapter: 9,
    from: 11,
    to: 25,
    mode: "teaching",
    titleEn: "How people reach for God",
    titleHi: "लोग ईश्वर तक कैसे पहुँचते हैं",
    themeEn: "Many paths of longing — and not despising simpler forms of faith",
    themeHi: "लालसा के अनेक मार्ग — साधारण श्रद्धा का तिरस्कार न करना",
  },
  {
    id: "9.26-34",
    chapter: 9,
    from: 26,
    to: 34,
    mode: "teaching",
    titleEn: "Offer what you have",
    titleHi: "जो है वही अर्पित करो",
    themeEn: "Small sincere offerings matter more than grand empty gestures",
    themeHi: "बड़े खोखले प्रदर्शन से छोटी सच्ची भेंट अधिक मायने रखती है",
  },

  // —— Chapter 10 ——
  {
    id: "10.1-11",
    chapter: 10,
    from: 1,
    to: 11,
    mode: "teaching",
    titleEn: "The source behind everything",
    titleHi: "सबके पीछे स्रोत",
    themeEn: "Awe at existence — remembering you are not the sole author of your life",
    themeHi: "अस्तित्व पर विस्मय — याद रखना कि जीवन के एकमात्र लेखक आप नहीं",
  },
  {
    id: "10.12-18",
    chapter: 10,
    from: 12,
    to: 18,
    mode: "scene",
    titleEn: "Arjuna asks to see more",
    titleHi: "अर्जुन और देखना चाहते हैं",
    themeEn: "Hunger to understand the divine more vividly",
    themeHi: "दिव्य को और स्पष्ट समझने की भूख",
    sceneEn:
      "Arjuna has heard enough to trust — and now he asks Krishna to describe the divine glories so his mind can hold them. This is not doubt; it is love wanting detail.\n\nSometimes we need concrete images of greatness — in nature, in courage, in wisdom — before abstract teaching settles.\n\nLet this unit be permission to ask for clarity without shame.",
    sceneHi:
      "अर्जुन ने इतना सुन लिया कि विश्वास जग गया — अब वे कृष्ण से दिव्य विभूतियाँ सुनना चाहते हैं ताकि मन उन्हें पकड़ सके। यह संदेह नहीं; प्रेम है जो विस्तार चाहता है।\n\nकभी-कभी अमूर्त शिक्षा बैठने से पहले हमें प्रकृति, साहस, ज्ञान में महानता की मूर्त छवियाँ चाहिए।\n\nयह खंड बिना लज्जा के स्पष्टता माँगने की अनुमति है।",
  },
  {
    id: "10.19-42",
    chapter: 10,
    from: 19,
    to: 42,
    mode: "teaching",
    titleEn: "Glory in the world you already know",
    titleHi: "जानी-पहचानी दुनिया में महिमा",
    themeEn: "Finding the sacred in excellence, beauty, and power you already notice",
    themeHi: "जो उत्कृष्टता, सौंदर्य और शक्ति आप पहले से देखते हैं उसमें दिव्य पाना",
  },

  // —— Chapter 11 ——
  {
    id: "11.1-8",
    chapter: 11,
    from: 1,
    to: 8,
    mode: "scene",
    titleEn: "Show me your form",
    titleHi: "अपना रूप दिखाएँ",
    themeEn: "Asking to see the whole truth — and receiving eyes to bear it",
    themeHi: "पूरा सत्य देखने की माँग — और उसे सहने की दृष्टि पाना",
    sceneEn:
      "Arjuna asks for the cosmic form. Krishna grants a divine eye — because ordinary sight cannot hold what is about to appear.\n\nThis is the threshold before overwhelm: wanting the full picture of reality, power, and time.\n\nIf you have ever asked life to “just show me everything,” these lines are that prayer — and a warning that the answer may be larger than comfort.",
    sceneHi:
      "अर्जुन विराट रूप माँगते हैं। कृष्ण दिव्य दृष्टि देते हैं — क्योंकि सामान्य आँखें आगे आने वाला दृश्य नहीं सह सकतीं।\n\nयह अभिभूत होने से पहले की देहली है: वास्तविकता, शक्ति और काल की पूरी तस्वीर चाहना।\n\nयदि आपने कभी जीवन से कहा हो «सब दिखा दो», ये पंक्तियाँ वही प्रार्थना हैं — और चेतावनी कि उत्तर आराम से बड़ा हो सकता है।",
  },
  {
    id: "11.9-34",
    chapter: 11,
    from: 9,
    to: 34,
    mode: "scene",
    titleEn: "The vision that undoes the ego",
    titleHi: "अहंकार तोड़ने वाला दर्शन",
    themeEn: "Awe, terror, and realizing you are small inside something vast",
    themeHi: "विस्मय, भय, और विशाल के भीतर अपनी लघुता का बोध",
    sceneEn:
      "What follows is not a cozy metaphor. Arjuna sees endless forms, blazing mouths, warriors entering the fire of time. He trembles. Krishna speaks as time itself: the warriors are already gone; Arjuna is an instrument.\n\nModern life rarely grants such a vision — but we know smaller versions: diagnosis, disaster, history moving through us.\n\nThese verses are meant to shatter the illusion that you control the whole field. Humility is the medicine. The story of your life is real; it is not the only story.",
    sceneHi:
      "आगे कोई आरामदायक रूपक नहीं। अर्जुन अनंत रूप, ज्वलंत मुख, काल की आग में प्रवेश करते योद्धा देखते हैं। वे काँपते हैं। कृष्ण स्वयं काल की तरह बोलते हैं: योद्धा पहले से चले गए; अर्जुन एक माध्यम हैं।\n\nआधुनिक जीवन शायद ही ऐसा दर्शन दे — पर छोटी प्रतिध्वनियाँ जानी हैं: निदान, आपदा, हममें से गुजरता इतिहास।\n\nये श्लोक उस भ्रम को तोड़ते हैं कि आप पूरे क्षेत्र को नियंत्रित करते हैं। विनम्रता औषधि है। आपके जीवन की कथा सत्य है; वह एकमात्र कथा नहीं।",
  },
  {
    id: "11.35-55",
    chapter: 11,
    from: 35,
    to: 55,
    mode: "teaching",
    titleEn: "After awe — devotion",
    titleHi: "विस्मय के बाद — भक्ति",
    themeEn: "Coming back to ordinary life changed: love, service, and seeing the divine in the familiar form",
    themeHi: "साधारण जीवन में लौटना — प्रेम, सेवा, परिचित रूप में दिव्य देखना",
  },

  // —— Chapter 12 ——
  {
    id: "12.1-12",
    chapter: 12,
    from: 1,
    to: 12,
    mode: "teaching",
    titleEn: "Many paths, one devotion",
    titleHi: "अनेक मार्ग, एक भक्ति",
    themeEn: "Choosing a spiritual practice that fits your nature without ranking others",
    themeHi: "अपनी प्रकृति के अनुकूल साधना — दूसरों को नीचा दिखाए बिना",
  },
  {
    id: "12.13-20",
    chapter: 12,
    from: 13,
    to: 20,
    mode: "teaching",
    titleEn: "The devotee’s everyday virtues",
    titleHi: "भक्त के दैनिक गुण",
    themeEn: "Kindness, steadiness, and letting go of hatred in ordinary relationships",
    themeHi: "साधारण संबंधों में दया, स्थिरता, द्वेष छोड़ना",
  },

  // —— Chapter 13 ——
  {
    id: "13.1-18",
    chapter: 13,
    from: 1,
    to: 18,
    mode: "teaching",
    titleEn: "The field and the knower",
    titleHi: "क्षेत्र और क्षेत्रज्ञ",
    themeEn: "Separating what happens to you from who is aware of it",
    themeHi: "आपके साथ घटित और उसे देखने वाले में भेद",
  },
  {
    id: "13.19-35",
    chapter: 13,
    from: 19,
    to: 35,
    mode: "teaching",
    titleEn: "Matter, spirit, and freedom",
    titleHi: "प्रकृति, पुरुष और मुक्ति",
    themeEn: "Understanding conditioning so you can meet life with less entanglement",
    themeHi: "बंधन कम करके जीवन से मिलने के लिए संस्कारों को समझना",
  },

  // —— Chapter 14 ——
  {
    id: "14.1-18",
    chapter: 14,
    from: 1,
    to: 18,
    mode: "teaching",
    titleEn: "Three moods of nature",
    titleHi: "प्रकृति के तीन स्वभाव",
    themeEn: "Recognizing clarity, restlessness, and inertia in your daily moods",
    themeHi: "दैनिक मनोदशा में सात्त्विक, राजस, तामस को पहचानना",
  },
  {
    id: "14.19-27",
    chapter: 14,
    from: 19,
    to: 27,
    mode: "teaching",
    titleEn: "Rising above the gunas",
    titleHi: "गुणों से ऊपर उठना",
    themeEn: "Not being owned by your moods — responding instead of being swept",
    themeHi: "मनोदशाओं का दास न होना — बहकने की जगह उत्तर देना",
  },

  // —— Chapter 15 ——
  {
    id: "15.1-6",
    chapter: 15,
    from: 1,
    to: 6,
    mode: "teaching",
    titleEn: "The inverted tree of life",
    titleHi: "उलटा संसार-वृक्ष",
    themeEn: "Seeing how desire roots you in patterns — and how to cut what no longer serves",
    themeHi: "कामना कैसे जड़ें जमाती है — और जो काम न आए उसे काटना",
  },
  {
    id: "15.7-11",
    chapter: 15,
    from: 7,
    to: 11,
    mode: "teaching",
    titleEn: "A spark of the divine in you",
    titleHi: "आपमें दिव्य की चिनगारी",
    themeEn: "Dignity of the living self amid temporary roles and bodies",
    themeHi: "अस्थायी भूमिकाओं और शरीरों के बीच जीव की गरिमा",
  },
  {
    id: "15.12-20",
    chapter: 15,
    from: 12,
    to: 20,
    mode: "teaching",
    titleEn: "The supreme person",
    titleHi: "पुरुषोत्तम",
    themeEn: "Orienting life toward what is highest, not only what is urgent",
    themeHi: "केवल तात्कालिक नहीं, सर्वोच्च की ओर जीवन मोड़ना",
  },

  // —— Chapter 16 ——
  {
    id: "16.1-5",
    chapter: 16,
    from: 1,
    to: 5,
    mode: "teaching",
    titleEn: "Divine qualities to grow",
    titleHi: "बढ़ाने योग्य दैवी गुण",
    themeEn: "Courage, honesty, restraint — traits that make a life trustworthy",
    themeHi: "साहस, सत्य, संयम — जो जीवन को विश्वसनीय बनाते हैं",
  },
  {
    id: "16.6-16",
    chapter: 16,
    from: 6,
    to: 16,
    mode: "teaching",
    titleEn: "When ego turns cruel",
    titleHi: "जब अहंकार क्रूर हो",
    themeEn: "Recognizing arrogance, exploitation, and self-justifying harm in yourself and culture",
    themeHi: "अपने और संस्कृति में अहंकार, शोषण, स्वार्थपूर्ण हिंसा पहचानना",
  },
  {
    id: "16.17-24",
    chapter: 16,
    from: 17,
    to: 24,
    mode: "teaching",
    titleEn: "Choose a guide wiser than impulse",
    titleHi: "आवेग से बड़ा मार्गदर्शक चुनो",
    themeEn: "Letting scripture and conscience check raw desire",
    themeHi: "कच्ची कामना पर शास्त्र और अंतःकरण की जाँच",
  },

  // —— Chapter 17 ——
  {
    id: "17.1-6",
    chapter: 17,
    from: 1,
    to: 6,
    mode: "teaching",
    titleEn: "Faith has a flavor",
    titleHi: "श्रद्धा का स्वाद",
    themeEn: "Noticing whether your faith is calm, restless, or dark — and what that creates",
    themeHi: "श्रद्धा शांत, बेचैन या अंधकारमय है — और वह क्या रचती है",
  },
  {
    id: "17.7-22",
    chapter: 17,
    from: 7,
    to: 22,
    mode: "teaching",
    titleEn: "Food, effort, and giving",
    titleHi: "आहार, तप और दान",
    themeEn: "Everyday habits of eating, discipline, and generosity as spiritual practice",
    themeHi: "खाना, अनुशासन और उदारता की आदतें — साधना के रूप में",
  },
  {
    id: "17.23-28",
    chapter: 17,
    from: 23,
    to: 28,
    mode: "teaching",
    titleEn: "Om Tat Sat — make it true",
    titleHi: "ॐ तत् सत् — सच बनाओ",
    themeEn: "Aligning speech, ritual, and intention so they are not empty",
    themeHi: "वचन, अनुष्ठान और आशय को खोखला न छोड़ना",
  },

  // —— Chapter 18 ——
  {
    id: "18.1-12",
    chapter: 18,
    from: 1,
    to: 12,
    mode: "teaching",
    titleEn: "True renunciation",
    titleHi: "सच्चा संन्यास",
    themeEn: "Letting go of unhealthy attachment without abandoning responsibility",
    themeHi: "उत्तरदायित्व छोड़े बिना अस्वस्थ आसक्ति छोड़ना",
  },
  {
    id: "18.13-28",
    chapter: 18,
    from: 13,
    to: 28,
    mode: "teaching",
    titleEn: "What makes an action",
    titleHi: "कर्म के अंग",
    themeEn: "Understanding the moving parts of choice so you judge yourself more fairly",
    themeHi: "चयन के अंग समझकर अपने प्रति न्यायसंगत होना",
  },
  {
    id: "18.29-40",
    chapter: 18,
    from: 29,
    to: 40,
    mode: "teaching",
    titleEn: "Knowledge, work, and the worker",
    titleHi: "ज्ञान, कर्म और कर्ता",
    themeEn: "Seeing how clarity or confusion colors how you work and decide",
    themeHi: "स्पष्टता या भ्रम कैसे काम और निर्णय को रंगते हैं",
  },
  {
    id: "18.41-48",
    chapter: 18,
    from: 41,
    to: 48,
    mode: "teaching",
    titleEn: "Honor your own dharma",
    titleHi: "अपने धर्म का सम्मान",
    themeEn: "Comparison culture vs doing the work that fits your nature well",
    themeHi: "तुलना की संस्कृति बनाम अपनी प्रकृति के अनुकूल काम",
  },
  {
    id: "18.49-55",
    chapter: 18,
    from: 49,
    to: 55,
    mode: "teaching",
    titleEn: "Toward inner perfection",
    titleHi: "भीतरी पूर्णता की ओर",
    themeEn: "Quiet excellence — maturity without show",
    themeHi: "शांत उत्कृष्टता — प्रदर्शन के बिना परिपक्वता",
  },
  {
    id: "18.56-66",
    chapter: 18,
    from: 56,
    to: 66,
    mode: "teaching",
    titleEn: "Surrender the weight",
    titleHi: "बोझ समर्पित करो",
    themeEn: "Carrying too much alone — entrusting the outcome while still walking your path",
    themeHi: "अकेले बहुत उठाना — मार्ग चलते हुए फल का समर्पण",
  },
  {
    id: "18.67-78",
    chapter: 18,
    from: 67,
    to: 78,
    mode: "scene",
    titleEn: "The teaching is sealed",
    titleHi: "उपदेश पूर्ण हुआ",
    themeEn: "Closing a hard conversation with clarity and courage to act",
    themeHi: "कठिन वार्ता का स्पष्ट अंत और कर्म का साहस",
    sceneEn:
      "The dialogue ends. Arjuna’s delusion is gone; he will stand and act. Sanjaya blesses anyone who hears this conversation with faith.\n\nThis is not another modern parable — it is a closing seal: understanding that does not move the hands is incomplete.\n\nIf a chapter of confusion in your life is ending, these verses are permission to rise, thank the guide (human or inner), and take the next honest step.",
    sceneHi:
      "संवाद समाप्त होता है। अर्जुन का मोह गया; वे खड़े होकर कर्म करेंगे। संजय श्रद्धा से इस वार्ता को सुनने वाले को आशीष देते हैं।\n\nयह कोई और आधुनिक रूपक नहीं — अंतिम मुद्रा है: जो समझ हाथ न हिलाए, अधूरी है।\n\nयदि जीवन के भ्रम का कोई अध्याय समाप्त हो रहा हो, ये श्लोक उठने, मार्गदर्शक (मानव या भीतरी) का धन्यवाद करने, और अगला ईमानदार कदम बढ़ाने की अनुमति हैं।",
  },
];

const byChapter = new Map<number, PassageUnit[]>();
for (const unit of PASSAGE_UNITS) {
  const list = byChapter.get(unit.chapter) ?? [];
  list.push(unit);
  byChapter.set(unit.chapter, list);
}

export function findPassageUnit(
  chapter: number,
  verse: number
): PassageUnit | null {
  const list = byChapter.get(chapter);
  if (!list) return null;
  return list.find((u) => verse >= u.from && verse <= u.to) ?? null;
}

/** Units for a chapter, ordered by verse range. */
export function getUnitsForChapter(chapter: number): PassageUnit[] {
  return byChapter.get(chapter) ?? [];
}

/** Full range label, e.g. `2.47–2.53` (never `2.47–53`). */
export function formatPassageRange(chapter: number, from: number, to: number): string {
  if (from === to) return `${chapter}.${from}`;
  return `${chapter}.${from}–${chapter}.${to}`;
}

export function formatUnitRange(unit: PassageUnit): string {
  return formatPassageRange(unit.chapter, unit.from, unit.to);
}

/** Template fluff from early auto-seeds — never show these as “stories”. */
export function isLowQualityStorySeed(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return (
    /Verse\s+\d+\.\d+\s+meets/i.test(t) ||
    /श्लोक\s+\d+\.\d+/.test(t) ||
    /feels a lot like .+ — familiar, heavy/i.test(t) ||
    /In plain terms, the teaching points/i.test(t)
  );
}
