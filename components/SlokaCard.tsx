"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { Sloka } from "@/lib/types";
import { formatVerseRef } from "@/lib/slokas";

type Props = {
  sloka: Sloka;
};

export default function SlokaCard({ sloka }: Props) {
  const { lang, t } = useLanguage();
  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;
  const meaning =
    lang === "hi" ? sloka.hindi_meaning : sloka.english_meaning;

  return (
    <Link
      href={`/sloka/${sloka.id}`}
      className="surface group block p-5 transition hover:translate-x-0.5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-body text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
          {formatVerseRef(sloka)}
        </p>
        <span className="text-xs text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100">
          {t("open")}
        </span>
      </div>
      <p className="mt-3 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {t("translation")}
      </p>
      <p className="mt-1 font-display text-lg leading-snug text-[var(--text)] line-clamp-2">
        {translation}
      </p>
      {meaning ? (
        <>
          <p className="mt-3 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t("meaning")}
          </p>
          <p className="mt-1 text-sm font-light text-[var(--text-muted)] line-clamp-2">
            {meaning}
          </p>
        </>
      ) : null}
    </Link>
  );
}
