"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import SlokaCard from "@/components/SlokaCard";
import { useLanguage } from "@/components/LanguageProvider";
import type { Sloka } from "@/lib/types";

export default function ExploreSearch() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/slokas?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as Sloka[];
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="mt-8">
      <label className="block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {t("searchLabel")}
      </label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="mt-2 w-full border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)]/55 outline-none focus:border-[var(--brass)]/50"
      />

      {query.trim() && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {loading
              ? t("searching")
              : `${results.length} ${
                  results.length === 1 ? t("result") : t("results")
                }`}
          </p>
          {!loading && results.length > 0 && (
            <div className="grid gap-3">
              {results.map((sloka) => (
                <SlokaCard key={sloka.id} sloka={sloka} />
              ))}
            </div>
          )}
          {!loading && results.length === 0 && (
            <EmptyState title={t("noSearchResults")} />
          )}
        </div>
      )}
    </div>
  );
}
