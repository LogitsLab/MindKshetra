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
  notFoundTitle: "Not found",
  notFoundBody: "That page or verse isn’t on this path.",
  backHome: "← Back to MindKshetra",
  start: "← Start",
  end: "End →",
  loading: "Loading…",
  historyIncognitoHint: "Turn off Incognito to browse saved chats.",
  navAstrology: "Astrology",
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
  notFoundTitle: "नहीं मिला",
  notFoundBody: "यह पृष्ठ या श्लोक इस मार्ग पर नहीं है।",
  backHome: "← MindKshetra पर लौटें",
  start: "← आरंभ",
  end: "अंत →",
  loading: "लोड हो रहा है…",
  historyIncognitoHint: "सहेजी वार्ताएँ देखने के लिए गुप्त मोड बंद करें।",
  navAstrology: "ज्योतिष",
};
