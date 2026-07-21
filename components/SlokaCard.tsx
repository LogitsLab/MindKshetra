"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { getChapterMeta } from "@/lib/chapters";
import type { Sloka } from "@/lib/types";
import { formatVerseRef } from "@/lib/sloka-utils";
import { hasCommentary } from "@/lib/verseDisplay";

type Props = {
  sloka: Sloka;
  /** Show chapter name under the verse ref (default true). */
  showChapter?: boolean;
  /** Show a completed checkmark. */
  completed?: boolean;
};

export default function SlokaCard({
  sloka,
  showChapter = true,
  completed = false,
}: Props) {
  const { lang, t } = useLanguage();
  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;
  const meaningRaw =
    lang === "hi" ? sloka.hindi_meaning : sloka.english_meaning;
  const meaning = hasCommentary(meaningRaw) ? meaningRaw : null;
  const chapter = showChapter ? getChapterMeta(sloka.chapter) : undefined;
  const chapterName =
    lang === "hi" ? chapter?.name_sanskrit : chapter?.name;

  return (
    <Link
      href={`/sloka/${sloka.id}`}
      className={`surface group block p-5 transition hover:translate-x-0.5 ${
        completed ? "border-[var(--brass)]/35" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
            {formatVerseRef(sloka)}
            {completed ? (
              <span className="ml-2 text-[var(--brass)]" title={t("markedComplete")}>
                ✓
              </span>
            ) : null}
          </p>
          {chapterName ? (
            <p className="mt-1 text-[0.65rem] tracking-[0.12em] text-[var(--text-muted)]">
              {t("chapter")} {sloka.chapter} · {chapterName}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100">
          {t("open")}
        </span>
      </div>
      <p className="mt-3 font-display text-lg leading-snug text-[var(--text)] line-clamp-2">
        {translation}
      </p>
      {meaning ? (
        <p className="mt-2 text-sm font-light text-[var(--text-muted)] line-clamp-2">
          {meaning}
        </p>
      ) : null}
    </Link>
  );
}
