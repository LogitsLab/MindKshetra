/**
 * Community (Model A) + themed paths + care copy.
 *
 * UI-only rename (WS6): the surface says "Community" / "समुदाय" now, but
 * internal names — this file, the sangha* keys, the sangha_attended event,
 * strategy-doc gate language — deliberately keep the word sangha. "सत्संग" /
 * "satsang" stays wherever it names the weekly live itself.
 */
export const en = {
  sanghaEyebrow: "Community",
  sanghaTitle: "Practice together",
  sanghaIntro:
    "Small circles and a weekly live — not a social feed. Join the channel, sit with others, then tap that you attended so we can see the community is real.",
  sanghaJoinWhatsApp: "WhatsApp daily verse",
  sanghaJoinTelegram: "Telegram discussion",
  sanghaChannelsSoon:
    "Community channels are being set up. Check back soon, or watch the footer once invite links are live.",
  sanghaLiveTitle: "Weekly live",
  sanghaLiveBlurb:
    "Thirty to forty-five minutes: one verse, one sit, questions with a human host. Consistency beats production value.",
  sanghaAttended: "I attended this week’s live",
  sanghaAttendedDone: "Recorded — thank you for showing up.",
  sanghaAttendedSignIn:
    "Sign in (even as guest) so attendance counts toward community gates.",
  sanghaSevaTitle: "Seva",
  sanghaSevaBlurb:
    "Once a month we name one small act tied to a chapter theme — blood donation, visiting elders, planting a tree. Announced on the channel when ready.",
  sanghaCareTitle: "Care path",
  sanghaCareBlurb:
    "If you are in crisis, Madhav will point you to helplines — never as a therapist. Partners and numbers live on the care page.",
  sanghaCareLink: "Helplines and care",
  pathListEyebrow: "Paths",
  pathListTitle: "Themed journeys",
  pathListIntro:
    "A week of verse, sit, and one honest line a day. Not a cure — a practice.",
  pathDay: "Day {n}",
  pathDayPractice: "Practice",
  pathPractice_sit: "quiet sit",
  pathPractice_japa: "japa",
  pathPractice_pranayama: "pranayama",
  pathPractice_flow: "full sādhana",
  pathDayMinutes: "min",
  pathMarkDone: "Mark day complete",
  pathMarked: "Day marked",
  pathRunProgress: "Day {n} of {total}",
  pathRunDone: "Completed",
  pathBeginPractice: "Begin day’s practice",
  pathSignInProgress: "Sign in to save progress across devices.",
  pathOpenVerse: "Open verse",
  pathBack: "All paths",
  careEyebrow: "Care",
  careTitle: "Helplines and human care",
  careIntro:
    "MindKshetra is a Gita companion, not clinical care. If you are in immediate danger, contact local emergency services. These numbers are starting points; we partner with NGOs to keep the list honest.",
  careIndiaTitle: "India",
  careDisclaimer:
    "Listing a helpline is not an endorsement of every call outcome. Prefer local emergency services when life is at risk. Mentors in the community are facilitators, not therapists.",
  microSevaTitle: "Today’s seva (verse-linked)",
  microSevaBlurb:
    "One kind act for someone near you — then sit with 3.21 or your path day’s verse. Never a generic wellness tip; always a teaching.",
} as const;

export const hi: Record<keyof typeof en, string> = {
  sanghaEyebrow: "समुदाय",
  sanghaTitle: "साथ अभ्यास",
  sanghaIntro:
    "छोटे मंडल और साप्ताहिक सत्संग — सामाजिक फ़ीड नहीं। चैनल जॉइन करें, साथ बैठें, फिर उपस्थिति दर्ज करें ताकि समुदाय सच में मापा जा सके।",
  sanghaJoinWhatsApp: "व्हाट्सऐप दैनिक श्लोक",
  sanghaJoinTelegram: "टेलीग्राम चर्चा",
  sanghaChannelsSoon:
    "समुदाय चैनल तैयार हो रहे हैं। जल्द वापस आएँ, या आमंत्रण लिंक आने पर पादलेख देखें।",
  sanghaLiveTitle: "साप्ताहिक सत्संग",
  sanghaLiveBlurb:
    "तीस से पैंतालीस मिनट: एक श्लोक, एक बैठना, मानव मेज़बान के साथ प्रश्न। निरंतरता प्रस्तुति से बड़ी है।",
  sanghaAttended: "मैंने इस सप्ताह के सत्संग में भाग लिया",
  sanghaAttendedDone: "दर्ज — आने के लिए धन्यवाद।",
  sanghaAttendedSignIn:
    "उपस्थिति समुदाय द्वारों में गिने जाने के लिए साइन इन करें (अतिथि भी ठीक)।",
  sanghaSevaTitle: "सेवा",
  sanghaSevaBlurb:
    "महीने में एक बार अध्याय से जुड़ा एक छोटा काम — रक्तदान, वृद्धों से भेंट, पौधा लगाना। चैनल पर घोषणा होगी।",
  sanghaCareTitle: "देखभाल मार्ग",
  sanghaCareBlurb:
    "संकट में Madhav हेल्पलाइन की ओर ले जाता है — चिकित्सक बनकर नहीं। साझेदार और नंबर देखभाल पृष्ठ पर हैं।",
  sanghaCareLink: "हेल्पलाइन और देखभाल",
  pathListEyebrow: "मार्ग",
  pathListTitle: "विषयगत यात्राएँ",
  pathListIntro:
    "एक सप्ताह: श्लोक, बैठना, और प्रतिदिन एक सच्ची पंक्ति। उपचार नहीं — अभ्यास।",
  pathDay: "दिन {n}",
  pathDayPractice: "अभ्यास",
  pathPractice_sit: "शांत बैठक",
  pathPractice_japa: "जप",
  pathPractice_pranayama: "प्राणायाम",
  pathPractice_flow: "पूर्ण साधना",
  pathDayMinutes: "मि",
  pathMarkDone: "दिन पूर्ण करें",
  pathMarked: "दिन दर्ज",
  pathRunProgress: "{total} में से दिन {n}",
  pathRunDone: "पूर्ण",
  pathBeginPractice: "दिन का अभ्यास शुरू करें",
  pathSignInProgress: "प्रगति सुरक्षित रखने के लिए साइन इन करें।",
  pathOpenVerse: "श्लोक खोलें",
  pathBack: "सभी मार्ग",
  careEyebrow: "देखभाल",
  careTitle: "हेल्पलाइन और मानवीय देखभाल",
  careIntro:
    "MindKshetra गीता साथी है, चिकित्सकीय देखभाल नहीं। तात्कालिक खतरे में स्थानीय आपातकालीन सेवाओं से संपर्क करें। ये नंबर आरंभ बिंदु हैं; सूची को ईमानदार रखने के लिए हम NGO से साझेदारी करते हैं।",
  careIndiaTitle: "भारत",
  careDisclaimer:
    "हेल्पलाइन सूची हर कॉल परिणाम का समर्थन नहीं है। जीवन जोखिम में स्थानीय आपातकाल प्राथमिक है। समुदाय के मार्गदर्शक सुविधाकार हैं, चिकित्सक नहीं।",
  microSevaTitle: "आज की सेवा (श्लोक से जुड़ी)",
  microSevaBlurb:
    "पास के किसी के लिए एक दयालु काम — फिर ३.२१ या आज के मार्ग-श्लोक के साथ बैठें। सामान्य वेलनेस सुझाव नहीं; सदैव शिक्षा।",
};
