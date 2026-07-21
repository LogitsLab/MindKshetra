"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  slokaId: number;
};

export default function FavoriteButton({ slokaId }: Props) {
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

  if (!user || user.is_anonymous) {
    return (
      <Link
        href="/account"
        className="min-h-10 border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
      >
        {t("signInToBookmark")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      aria-pressed={saved}
      className="min-h-10 border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] disabled:opacity-50"
    >
      {saved ? t("bookmarked") : t("bookmark")}
    </button>
  );
}
