"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { DictKey } from "@/lib/i18n/dictionary";

type Base = {
  eyebrowKey: DictKey;
  introKey?: DictKey;
  /** Extra localized lines under the intro. Must come from a client parent. */
  children?: React.ReactNode;
  className?: string;
};

/**
 * The title is either copy (a dictionary key) or content (a verse ref, a name).
 * Exactly one, never both — a page that passes both has not decided which.
 */
type Titled =
  | { titleKey: DictKey; title?: never }
  | { titleKey?: never; title: string };

/**
 * Page-shell header for server pages that keep `export const metadata` but
 * whose visible eyebrow/H1 must follow the language toggle (des/DT6). The
 * html[lang="hi"] rule in globals.css already strips tracking/uppercase from
 * Devanagari eyebrows.
 */
export default function LocalizedPageHeader({
  eyebrowKey,
  introKey,
  children,
  className = "",
  ...rest
}: Base & Titled) {
  const { t } = useLanguage();
  const title = "title" in rest && rest.title ? rest.title : t(rest.titleKey!);

  return (
    <header className={`mb-8 max-w-2xl ${className}`}>
      <p className="eyebrow text-[var(--brass-soft)]">{t(eyebrowKey)}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
        {title}
      </h1>
      {introKey ? (
        <p className="mt-3 text-[var(--text-muted)]">{t(introKey)}</p>
      ) : null}
      {children}
    </header>
  );
}
