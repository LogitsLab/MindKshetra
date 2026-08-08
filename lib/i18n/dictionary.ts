import * as shared from "@/lib/i18n/namespaces/shared";
import * as gita from "@/lib/i18n/namespaces/gita";
import * as astrology from "@/lib/i18n/namespaces/astrology";
import * as account from "@/lib/i18n/namespaces/account";
import * as chat from "@/lib/i18n/namespaces/chat";
import * as sadhana from "@/lib/i18n/namespaces/sadhana";
import * as support from "@/lib/i18n/namespaces/support";
import * as sangha from "@/lib/i18n/namespaces/sangha";
import * as meditation from "@/lib/i18n/namespaces/meditation";
import * as wallpapers from "@/lib/i18n/namespaces/wallpapers";

/**
 * i18n entry point.
 *
 *   namespaces/shared     18 keys   nav, language, generic chrome
 *   namespaces/gita      118 keys   verses, chapters, moods, search, stories
 *   namespaces/astrology 196 keys   charts, dashas, remedies, panchang
 *   namespaces/account    65 keys   auth, profile, favourites, journal, email
 *   namespaces/chat       39 keys   Madhav, starters, sessions, TTS
 *   namespaces/sangha     sangha, paths, care
 *                        ───────
 *                        436+ keys
 *
 * This used to be one flat 957-line object (ceo/T4). It was the highest-churn
 * file in the repo, 18 commits in 30 days, because every feature in every
 * domain appended to the same list, so unrelated work collided constantly.
 * Astrology alone is 45% of the strings.
 *
 * The composed shape below is IDENTICAL to the old one, so `t()`, `DictKey` and
 * every consumer are untouched. Only the source layout changed.
 *
 * Adding a string: put it in the namespace that owns the surface. If it has no
 * owner it belongs in `shared`, and if `shared` starts growing fast, that is a
 * signal the surface needs its own namespace, not that shared should absorb it.
 */
export type AppLang = "en" | "hi";

export const dictionary = {
  en: {
    ...shared.en,
    ...gita.en,
    ...astrology.en,
    ...account.en,
    ...chat.en,
    ...sadhana.en,
    ...support.en,
    ...sangha.en,
    ...meditation.en,
    ...wallpapers.en,
  },
  hi: {
    ...shared.hi,
    ...gita.hi,
    ...astrology.hi,
    ...account.hi,
    ...chat.hi,
    ...sadhana.hi,
    ...support.hi,
    ...sangha.hi,
    ...meditation.hi,
    ...wallpapers.hi,
  },
} as const;

export type DictKey = keyof typeof dictionary.en;

export function t(lang: AppLang, key: DictKey): string {
  return dictionary[lang][key] ?? dictionary.en[key];
}
