"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  slokaId: number;
  /** Quiet text control instead of bordered button. */
  quiet?: boolean;
};

export default function FavoriteButton({ slokaId, quiet = false }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.is_anonymous) return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.slokas ?? []).map((s: { id: number }) => s.id);
        setSaved(ids.includes(slokaId));
      })
      .catch(() => {});
  }, [user, slokaId]);

  async function toggle() {
    if (!user || user.is_anonymous) return;
    setLoading(true);
    try {
      if (saved) {
        await fetch(`/api/favorites?slokaId=${slokaId}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slokaId }),
        });
        setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const quietClass =
    "inline-flex h-8 items-center text-sm leading-none text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50";
  const solidClass =
    "min-h-10 border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] disabled:opacity-50";

  if (!user || user.is_anonymous) {
    return (
      <Link
        href="/account"
        title={t("signInToBookmark")}
        className={quiet ? quietClass : solidClass}
      >
        {t("bookmark")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      aria-pressed={saved}
      className={quiet ? quietClass : solidClass}
    >
      {saved ? t("bookmarked") : t("bookmark")}
    </button>
  );
}
