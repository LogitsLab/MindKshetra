"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import SlokaCard from "@/components/SlokaCard";
import { useLanguage } from "@/components/LanguageProvider";
import { SEARCH_SUGGESTIONS } from "@/lib/slokas";
import type { Sloka } from "@/lib/types";

type SearchPayload = {
  results: Sloka[];
  nearest?: Sloka[];
  didYouMean?: string[];
};

export default function ExploreSearch() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<Sloka[]>([]);
  const [nearest, setNearest] = useState<Sloka[]>([]);
  const [didYouMean, setDidYouMean] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("q") ?? "";
    setQuery(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setNearest([]);
      setDidYouMean([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/slokas?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as SearchPayload | Sloka[];
        if (Array.isArray(data)) {
          setResults(data);
          setNearest([]);
          setDidYouMean([]);
        } else {
          setResults(data.results ?? []);
          setNearest(data.nearest ?? []);
          setDidYouMean(data.didYouMean ?? []);
        }
      } catch {
        setResults([]);
        setNearest([]);
        setDidYouMean([]);
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
        className="mt-2 w-full border border-[var(--line)] bg-black/25 px-4 py-3 text-base text-[var(--text)] placeholder:text-[var(--text-muted)]/55 outline-none focus:border-[var(--brass)]/50 sm:text-[15px]"
      />

      {!query.trim() && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="w-full text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t("tryThemes")}
          </span>
          {SEARCH_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="min-h-10 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

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
            <div className="space-y-4">
              <EmptyState
                title={t("noSearchResults")}
                body={t("searchEmptyHint")}
              />

              {didYouMean.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {t("didYouMean")}
                  </span>
                  {didYouMean.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="min-h-10 border border-[var(--brass)]/40 px-3 py-1.5 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]/70"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}

              {nearest.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    {t("nearestVerses")}
                  </p>
                  <div className="grid gap-3">
                    {nearest.map((sloka) => (
                      <SlokaCard key={sloka.id} sloka={sloka} />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {SEARCH_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="min-h-10 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
                  >
                    {s}
                  </button>
                ))}
                <Link
                  href="#chapters"
                  className="min-h-10 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]/45"
                >
                  {t("browseChapters")}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
