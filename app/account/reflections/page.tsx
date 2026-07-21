"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type Entry = {
  id: number;
  sloka_id: number;
  reflection: string;
  created_at: string;
};

export default function ReflectionsPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
  }, []);

  return (
    <div className="animate-fade max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-[var(--text)]">
        {t("myReflections")}
      </h1>
      <div className="mt-8 space-y-4">
        {entries.length === 0 ? (
          <p className="text-[var(--text-muted)]">{t("noReflections")}</p>
        ) : (
          entries.map((e) => (
            <article
              key={e.id}
              className="border border-[var(--line)] bg-[var(--input-bg)] p-4"
            >
              <Link
                href={`/sloka/${e.sloka_id}`}
                className="text-sm text-[var(--brass-soft)])"
              >
                {t("verse")} →
              </Link>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
                {e.reflection}
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {new Date(e.created_at).toLocaleDateString()}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
