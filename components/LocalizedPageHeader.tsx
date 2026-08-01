"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { DictKey } from "@/lib/i18n/dictionary";

/**
 * Page-shell header for server pages that keep `export const metadata` but
 * whose visible eyebrow/H1 must follow the language toggle (des/DT6). The
 * html[lang="hi"] rule in globals.css already strips tracking/uppercase from
 * Devanagari eyebrows.
 */
export default function LocalizedPageHeader({
  eyebrowKey,
  titleKey,
  introKey,
}: {
  eyebrowKey: DictKey;
  titleKey: DictKey;
  introKey?: DictKey;
}) {
  const { t } = useLanguage();
  return (
    <header className="mb-8 max-w-2xl">
      <p className="eyebrow text-[var(--brass-soft)]">
        {t(eyebrowKey)}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
        {t(titleKey)}
      </h1>
      {introKey ? (
        <p className="mt-3 text-[var(--text-muted)]">{t(introKey)}</p>
      ) : null}
    </header>
  );
}
