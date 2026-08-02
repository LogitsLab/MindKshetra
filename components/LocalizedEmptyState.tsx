"use client";

import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import type { DictKey } from "@/lib/i18n/dictionary";

/**
 * `EmptyState` for server pages, the same way `LocalizedPageHeader` is a header
 * for server pages (des/DT6): the page keeps `export const metadata` and its
 * static render, and the copy still follows the language toggle.
 *
 * Without this, a server-rendered empty is stuck in whichever language it was
 * typed in — which is how "Verse unavailable." shipped as the only English
 * string on an otherwise bilingual page.
 */
export default function LocalizedEmptyState({
  titleKey,
  bodyKey,
  className,
}: {
  titleKey: DictKey;
  bodyKey?: DictKey;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <EmptyState
      title={t(titleKey)}
      body={bodyKey ? t(bodyKey) : undefined}
      className={className}
    />
  );
}
