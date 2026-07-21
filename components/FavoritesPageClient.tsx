"use client";

import { useEffect, useState } from "react";
import SlokaCard from "@/components/SlokaCard";
import { useLanguage } from "@/components/LanguageProvider";
import type { Sloka } from "@/lib/types";

export default function FavoritesPageClient() {
  const { t } = useLanguage();
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => setSlokas(d.slokas ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade">
      <h1 className="font-display text-3xl font-semibold text-[var(--text)]">
        {t("favorites")}
      </h1>
      <p className="mt-2 text-[var(--text-muted)]">{t("favoritesBlurb")}</p>
      <div className="mt-8 grid gap-3">
        {loading ? (
          <p className="text-[var(--text-muted)]">{t("loading")}</p>
        ) : slokas.length === 0 ? (
          <p className="text-[var(--text-muted)]">{t("noFavorites")}</p>
        ) : (
          slokas.map((s) => <SlokaCard key={s.id} sloka={s} />)
        )}
      </div>
    </div>
  );
}
