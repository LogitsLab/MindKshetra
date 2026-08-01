"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { PracticePath } from "@/lib/paths";

export default function PathsListClient({ paths }: { paths: PracticePath[] }) {
  const { lang } = useLanguage();

  if (paths.length === 0) {
    return (
      <p className="max-w-2xl text-[15px] font-light text-[var(--text-muted)]">
        —
      </p>
    );
  }

  return (
    <ul className="max-w-2xl space-y-4">
      {paths.map((path) => (
        <li key={path.id}>
          <Link
            href={`/paths/${path.id}`}
            className="group block border border-[var(--line)] px-5 py-6 transition hover:border-[var(--brass)]/40"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
              {path.days_count}{" "}
              {lang === "hi" ? "दिन" : "days"}
            </p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
              {lang === "hi" ? path.title_hi : path.title_en}
            </h2>
            <p className="mt-2 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
              {lang === "hi" ? path.intro_hi : path.intro_en}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
