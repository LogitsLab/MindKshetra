"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REFLECTION_SHARED_EVENT } from "@/components/JournalBox";
import { useLanguage } from "@/components/LanguageProvider";

type Reflection = {
  id: string;
  reflection: string;
  sharedAt: string | null;
  author: { handle: string; displayName: string | null } | null;
};

/**
 * "Reflections from seekers" — shared journal lines on a verse. Quiet by
 * design: no reactions, no counts, chronology only. Reporting is one tap;
 * blocked authors are filtered server-side.
 */
export default function VerseReflections({ slokaId }: { slokaId: number }) {
  const { t } = useLanguage();
  const [reflections, setReflections] = useState<Reflection[] | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    // Sequence requests so a slow initial load resolving AFTER the
    // post-share refetch can't overwrite the list with its pre-share
    // snapshot; no-store because the route caches empty lists for 60s and a
    // cached empty body would swallow the just-shared line.
    let requestSeq = 0;
    const load = () => {
      const seq = ++requestSeq;
      fetch(`/api/slokas/${slokaId}/reflections`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : { reflections: [] }))
        .then((data) => {
          if (!cancelled && seq === requestSeq) {
            setReflections(data.reflections ?? []);
          }
        })
        .catch(() => {
          // First load falls back to empty; a failed refetch keeps the list.
          if (!cancelled && seq === requestSeq) {
            setReflections((prev) => prev ?? []);
          }
        });
    };
    load();
    // Close the share loop: when JournalBox shares a line on this verse,
    // refetch so the person sees their words appear where they will live.
    const onShared = (event: Event) => {
      const detail = (event as CustomEvent<{ slokaId?: number }>).detail;
      if (detail?.slokaId === slokaId) load();
    };
    window.addEventListener(REFLECTION_SHARED_EVENT, onShared);
    return () => {
      cancelled = true;
      window.removeEventListener(REFLECTION_SHARED_EVENT, onShared);
    };
  }, [slokaId]);

  function report(id: string) {
    setReported((prev) => new Set(prev).add(id));
    void fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "reflection", contentId: id }),
    }).catch(() => {});
  }

  // Loading and empty both render nothing extra beyond the invitation line —
  // a verse page must never feel like an empty forum.
  if (!reflections) return null;

  return (
    <section className="mt-6 border-t border-[var(--line)] pt-6">
      <h2 className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {t("reflectionsTitle")}
      </h2>
      {reflections.length === 0 ? (
        <p className="mt-3 text-sm font-light text-[var(--text-muted)]">
          {t("reflectionsFirst")}
        </p>
      ) : (
        <ul className="mt-4 space-y-5">
          {reflections.map((item) => (
            <li key={item.id} className="border-l-2 border-[var(--hairline)] pl-4">
              <p className="text-[15px] font-light leading-relaxed text-[var(--text)]">
                {item.reflection}
              </p>
              <p className="mt-1.5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                {item.author ? (
                  <Link
                    href={`/u/${item.author.handle}`}
                    className="hover:text-[var(--brass-soft)]"
                  >
                    {item.author.displayName || `@${item.author.handle}`}
                  </Link>
                ) : (
                  <span>{t("reflectionsSeeker")}</span>
                )}
                <button
                  type="button"
                  onClick={() => report(item.id)}
                  disabled={reported.has(item.id)}
                  className="underline-offset-2 hover:text-[var(--brass-soft)] hover:underline disabled:no-underline disabled:opacity-70"
                >
                  {reported.has(item.id) ? t("reflectReported") : t("reflectReport")}
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
