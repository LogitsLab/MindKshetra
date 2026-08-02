import "server-only";

/**
 * Notification copy, server-side EN/HI keyed by user_preferences
 * .preferred_language (client i18n namespaces are never imported here).
 * Register: invitational, never guilt — "your practice continues tonight",
 * never "you missed a day".
 */
type Lang = "en" | "hi";

export function normalizePushLang(value: unknown): Lang {
  return value === "hi" ? "hi" : "en";
}

export function dailyVerseCopy(
  lang: Lang,
  ref: string
): { title: string; body: string } {
  if (lang === "hi") {
    return {
      title: `आज का श्लोक · ${ref}`,
      body: "दिन शुरू होने से पहले गीता के साथ एक क्षण।",
    };
  }
  return {
    title: `Verse of the day · ${ref}`,
    body: "A minute with the Gita before the day begins.",
  };
}

export function streakReminderCopy(
  lang: Lang,
  current: number
): { title: string; body: string } {
  if (lang === "hi") {
    return {
      title: `आपकी ${current} दिन की साधना`,
      body: "आज एक श्लोक इसे जारी रखेगा।",
    };
  }
  return {
    title: `Your ${current}-day practice`,
    body: "One verse this evening keeps it alive.",
  };
}
