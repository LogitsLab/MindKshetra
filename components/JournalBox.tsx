"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  slokaId: number;
};

/**
 * Dispatched on window after a reflection is successfully shared, with
 * { slokaId } as detail. VerseReflections listens and refetches so the
 * person's line appears on the page they are looking at.
 */
export const REFLECTION_SHARED_EVENT = "mindkshetra:reflection-shared";

export default function JournalBox({ slokaId }: Props) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [shareState, setShareState] = useState<
    "idle" | "sharing" | "shared" | "held"
  >("idle");
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || user.is_anonymous) return;
    const text = reflection.trim();
    if (!text) return;

    setLoading(true);
    setSaveFailed(false);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slokaId, reflection: text }),
      });
      if (!res.ok) throw new Error("journal save failed");
      const data = await res.json().catch(() => null);
      setSaved(true);
      setSavedId(typeof data?.id === "number" ? data.id : null);
      setShareState("idle");
      setShareNotice(null);
      setReflection("");
    } catch {
      // The words stay in the box — a failed save must never look like a
      // successful one.
      setSaveFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!savedId) return;
    setShareState("sharing");
    setShareNotice(null);
    try {
      const res = await fetch(`/api/journal/${savedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "shared", language: lang }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.shared) {
        setShareState("shared");
        window.dispatchEvent(
          new CustomEvent(REFLECTION_SHARED_EVENT, { detail: { slokaId } })
        );
      } else if (res.ok && data?.held) {
        setShareState("held");
        // Crisis holds carry the helpline text — show it verbatim, gently.
        if (typeof data?.message === "string") setShareNotice(data.message);
      } else {
        setShareState("idle");
        if (typeof data?.error === "string") setShareNotice(data.error);
      }
    } catch {
      setShareState("idle");
    }
  }

  if (!user || user.is_anonymous) {
    return (
      <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {t("journalTitle")}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">{t("signInToJournal")}</p>
        <Link
          href="/account"
          className="inline-flex min-h-10 items-center border border-[var(--line)] px-3 py-2 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]/45"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 border-t border-[var(--line)] pt-6">
      <h2 className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {t("journalTitle")}
      </h2>
      <textarea
        value={reflection}
        onChange={(e) => {
          setReflection(e.target.value);
          setSaved(false);
          setSaveFailed(false);
        }}
        placeholder={t("journalPlaceholder")}
        rows={3}
        className="w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]/55 focus:border-[var(--brass)]/50"
      />
      <button
        type="submit"
        disabled={loading || !reflection.trim()}
        className="min-h-10 bg-[var(--brass)] px-4 py-2 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
      >
        {saved ? t("journalSaved") : t("journalSave")}
      </button>

      {saveFailed ? (
        <p className="border-l-2 border-[var(--brass)]/60 pl-3 text-sm text-[var(--text-soft)]">
          {t("journalSaveFailed")}
        </p>
      ) : null}

      {saved && savedId ? (
        <div className="pt-1">
          {shareState === "shared" ? (
            <p className="text-sm text-[var(--brass-soft)]">
              {t("reflectShared")}
            </p>
          ) : shareState === "held" ? (
            <p className="text-sm text-[var(--text-muted)]">{t("reflectHeld")}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void share()}
                disabled={shareState === "sharing"}
                className="min-h-10 border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] disabled:opacity-50"
              >
                {t("reflectShare")}
              </button>
              <span className="text-xs font-light text-[var(--text-muted)]">
                {t("reflectShareConsent")}
              </span>
            </div>
          )}
          {shareNotice ? (
            <p className="mt-3 whitespace-pre-line border-l-2 border-[var(--brass)]/60 pl-3 text-sm leading-relaxed text-[var(--text-muted)]">
              {shareNotice}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
