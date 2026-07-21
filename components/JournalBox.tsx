"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  slokaId: number;
};

export default function JournalBox({ slokaId }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || user.is_anonymous) return;
    const text = reflection.trim();
    if (!text) return;

    setLoading(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slokaId, reflection: text }),
      });
      if (res.ok) {
        setSaved(true);
        setReflection("");
      }
    } finally {
      setLoading(false);
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
    </form>
  );
}
