/**
 * App chrome shared by every surface: navigation, language toggle,
 * generic states (loading, not found) and anything with no single owner.
 *
 * Split out of the former flat lib/i18n/dictionary.ts (ceo/T4). The composed
 * export shape is unchanged, so no component needed touching.
 */
export const en = {
  navExplore: "Explore",
  navMood: "Mood",
  navMadhav: "Ask Madhav",
  langEn: "EN",
  langHi: "हिं",
  langSwitchToHi: "हिंदी",
  langSwitchToEn: "English",
  of: "of",
  menuOpen: "Open menu",
  menuClose: "Close menu",
  skipToContent: "Skip to content",
  notFoundTitle: "Not found",
  notFoundBody: "That page or verse isn’t on this path.",
  /* The error boundary. Invitational, never accusatory: nothing the reader did
     caused this, and "try again" is an offer, not an instruction. */
  errorTitle: "Something went wrong on our side",
  errorBody:
    "The page didn’t load. Nothing you have saved is affected — trying again is usually enough.",
  errorRetry: "Try again",
  votdEyebrow: "Verse of the day",
  /* {nakshatra} is substituted at the call site — the same placeholder idiom
     the panchang strings use. */
  votdNakshatraNote: "Chosen for today’s Moon in {nakshatra}",
  votdUnavailable: "Today’s verse isn’t ready",
  votdUnavailableBody:
    "The verse rotates once a day. Explore the chapters in the meantime — all 701 are here.",
  backHome: "← Back to MindKshetra",
  start: "← Start",
  end: "End →",
  loading: "Loading…",
  historyIncognitoHint: "Turn off Incognito to browse saved chats.",
  navAstrology: "Astrology",
  navPanchang: "Panchang",
  navPractice: "Practice",
  navMore: "More",
  navSangha: "Community",
  navPrivacy: "Privacy",
  navAccount: "Account",
} as const;

export const hi: Record<keyof typeof en, string> = {
  navExplore: "अन्वेषण",
  navMood: "मनोदशा",
  navMadhav: "माधव से पूछें",
  langEn: "EN",
  langHi: "हिं",
  langSwitchToHi: "हिंदी",
  langSwitchToEn: "English",
  of: "में से",
  menuOpen: "मेनू खोलें",
  menuClose: "मेनू बंद करें",
  skipToContent: "सीधे मुख्य सामग्री पर जाएँ",
  notFoundTitle: "नहीं मिला",
  notFoundBody: "यह पृष्ठ या श्लोक इस मार्ग पर नहीं है।",
  errorTitle: "हमारी ओर से कुछ गड़बड़ हुई",
  errorBody:
    "पृष्ठ लोड नहीं हो पाया। आपका सहेजा हुआ कुछ भी प्रभावित नहीं हुआ — प्रायः फिर से प्रयास पर्याप्त होता है।",
  errorRetry: "फिर प्रयास करें",
  votdEyebrow: "आज का श्लोक",
  votdNakshatraNote: "आज चंद्रमा {nakshatra} में — उसी के अनुसार चुना गया",
  votdUnavailable: "आज का श्लोक अभी तैयार नहीं",
  votdUnavailableBody:
    "श्लोक दिन में एक बार बदलता है। तब तक अध्याय देखें — सभी 701 श्लोक यहीं हैं।",
  backHome: "← MindKshetra पर लौटें",
  start: "← आरंभ",
  end: "अंत →",
  loading: "लोड हो रहा है…",
  historyIncognitoHint: "सहेजी वार्ताएँ देखने के लिए गुप्त मोड बंद करें।",
  navAstrology: "ज्योतिष",
  navPanchang: "पंचांग",
  navPractice: "साधना",
  navMore: "और",
  navSangha: "समुदाय",
  navPrivacy: "गोपनीयता",
  navAccount: "खाता",
};
