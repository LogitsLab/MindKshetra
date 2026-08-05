"use client";

import { useProgress } from "@/components/ProgressProvider";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  slokaId: number;
  /** Quiet text control instead of bordered button. */
  quiet?: boolean;
};

export default function CompleteVerseButton({
  slokaId,
  quiet = false,
}: Props) {
  const { t } = useLanguage();
  const { isComplete, markComplete } = useProgress();
  const done = isComplete(slokaId);

  if (quiet) {
    return (
      <button
        type="button"
        onClick={() => void markComplete(slokaId, !done)}
        className={`inline-flex h-8 items-center text-sm leading-none transition ${
          done
            ? "text-[var(--brass-soft)]"
            : "text-[var(--text-muted)] hover:text-[var(--brass-soft)]"
        }`}
        aria-pressed={done}
      >
        {done ? `✓ ${t("markedComplete")}` : t("markComplete")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void markComplete(slokaId, !done)}
      className={`min-h-10 border px-3 py-1.5 text-xs transition ${
        done
          ? "border-[var(--brass)]/50 bg-[var(--brass)]/10 text-[var(--brass-soft)]"
          : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
      }`}
      aria-pressed={done}
    >
      {done ? `✓ ${t("markedComplete")}` : t("markComplete")}
    </button>
  );
}
