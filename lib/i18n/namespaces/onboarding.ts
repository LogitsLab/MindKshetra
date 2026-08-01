/**
 * First-visit web onboarding (WS2) — ported from the mobile flow
 * (MindKshetra-app app/onboarding.tsx + src/i18n/namespaces/onboarding.ts):
 * welcome → what's inside → language → join-or-guest. Auth button labels
 * (signInGoogle, guest, email form) are reused from the account namespace so
 * the two sign-in surfaces can never drift apart.
 */
export const en = {
  onboardingWelcomeEyebrow: "Welcome to MindKshetra",
  onboardingWelcomeTitle: "Clarity for the battlefield of the mind",
  onboardingBrandStory:
    "MindKshetra is the field of the mind — a calm Bhagavad Gita companion for moments of duty, doubt, and confusion. Read, reflect, and return when life feels heavy.",
  onboardingPathsEyebrow: "What's inside",
  onboardingPathsTitle: "How MindKshetra helps",
  onboardingPathExploreTitle: "Explore",
  onboardingPathExploreBlurb:
    "All 18 chapters — Sanskrit, transliteration, Hindi and English.",
  onboardingPathMoodTitle: "Mood",
  onboardingPathMoodBlurb:
    "Name how you feel. Find verses that meet you there.",
  onboardingPathMadhavTitle: "Ask Madhav",
  onboardingPathMadhavBlurb:
    "Guidance in Krishna’s voice, grounded in real teachings.",
  onboardingPathAstrologyTitle: "Astrology",
  onboardingPathAstrologyBlurb:
    "Birth chart, dasha, and chart-aware guidance — alongside the Gita.",
  onboardingPathSadhanaTitle: "Sādhana",
  onboardingPathSadhanaBlurb:
    "A verse, a short sit, one quiet line — a daily practice.",
  onboardingLangEyebrow: "Your preference",
  onboardingLangTitle: "Choose your language",
  onboardingLangBody:
    "Pick how you’d like to read verses, meanings, and the app itself. You can change this anytime.",
  onboardingLangEn: "English",
  onboardingLangHi: "हिंदी",
  onboardingLangPreviewEn: "The field of the mind awaits.",
  onboardingLangPreviewHi: "मन का क्षेत्र आपका इंतज़ार कर रहा है।",
  onboardingLangSelected: "Selected",
  onboardingAuthEyebrow: "One last step",
  onboardingAuthTitle: "Save your path",
  onboardingAuthBody:
    "Sign in to keep bookmarks, reflections, Madhav chats, and reading progress — then pick up on any device.",
  onboardingGuestNote:
    "Guests keep their progress on this device — you can join anytime to keep it across devices.",
  onboardingContinue: "Continue",
  onboardingGetStarted: "Enter MindKshetra",
  onboardingBack: "Go back",
  /** On web this really does skip to the app — language and sign-in stay one tap away in the nav. */
  onboardingSkip: "Skip for now",
  onboardingEnterAnyway: "Enter without an account",
  onboardingStepOf: "Step {n} of {total}",
  onboardingGuestNudge:
    "Practicing as a guest — join to keep it across devices.",
} as const;

export const hi: Record<keyof typeof en, string> = {
  onboardingWelcomeEyebrow: "MindKshetra में स्वागत है",
  onboardingWelcomeTitle: "मन के कुरुक्षेत्र के लिए स्पष्टता",
  onboardingBrandStory:
    "MindKshetra मन का क्षेत्र है — कर्तव्य, संशय और उलझन के क्षणों के लिए एक शांत भगवद्गीता साथी। पढ़ें, चिंतन करें, और जब जीवन भारी लगे तब लौटें।",
  onboardingPathsEyebrow: "अंदर क्या है",
  onboardingPathsTitle: "MindKshetra कैसे मदद करता है",
  onboardingPathExploreTitle: "अन्वेषण",
  onboardingPathExploreBlurb:
    "सभी १८ अध्याय — संस्कृत, लिप्यंतरण, हिंदी और अंग्रेज़ी।",
  onboardingPathMoodTitle: "मनोदशा",
  onboardingPathMoodBlurb: "अपनी भावना बताएँ। उसी से जुड़ते श्लोक पाएँ।",
  onboardingPathMadhavTitle: "माधव से पूछें",
  onboardingPathMadhavBlurb:
    "कृष्ण की वाणी में मार्गदर्शन, वास्तविक शिक्षाओं पर आधारित।",
  onboardingPathAstrologyTitle: "ज्योतिष",
  onboardingPathAstrologyBlurb:
    "जन्म कुंडली, दशा और कुंडली-आधारित मार्गदर्शन — गीता के साथ।",
  onboardingPathSadhanaTitle: "साधना",
  onboardingPathSadhanaBlurb:
    "एक श्लोक, एक छोटी बैठक, एक शांत पंक्ति — प्रतिदिन का अभ्यास।",
  onboardingLangEyebrow: "आपकी पसंद",
  onboardingLangTitle: "भाषा चुनें",
  onboardingLangBody:
    "श्लोक, अर्थ और ऐप किस भाषा में दिखें — चुनें। इसे कभी भी बदल सकते हैं।",
  onboardingLangEn: "English",
  onboardingLangHi: "हिंदी",
  onboardingLangPreviewEn: "The field of the mind awaits.",
  onboardingLangPreviewHi: "मन का क्षेत्र आपका इंतज़ार कर रहा है।",
  onboardingLangSelected: "चुना गया",
  onboardingAuthEyebrow: "आखिरी कदम",
  onboardingAuthTitle: "अपना मार्ग सहेजें",
  onboardingAuthBody:
    "साइन इन करें ताकि बुकमार्क, चिंतन, माधव वार्ता और पठन प्रगति सुरक्षित रहे — फिर किसी भी उपकरण पर जारी रखें।",
  onboardingGuestNote:
    "अतिथि की प्रगति इसी डिवाइस पर रहती है — कभी भी जुड़कर इसे सभी उपकरणों पर सहेज सकते हैं।",
  onboardingContinue: "आगे बढ़ें",
  onboardingGetStarted: "MindKshetra में प्रवेश करें",
  onboardingBack: "पीछे जाएँ",
  onboardingSkip: "अभी छोड़ें",
  onboardingEnterAnyway: "बिना खाते के प्रवेश करें",
  onboardingStepOf: "कुल {total} में से चरण {n}",
  onboardingGuestNudge:
    "अतिथि रूप में अभ्यास — सभी उपकरणों पर सहेजने के लिए जुड़ें।",
};
