"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const HELPLINES = [
  {
    name: "tele-MANAS",
    detail: "14416 · Government of India mental health helpline (24×7)",
  },
  {
    name: "iCall",
    detail: "9152987821 · Psychosocial helpline (TISS)",
  },
  {
    name: "AASRA",
    detail: "9820466726 · Suicide prevention (24×7)",
  },
] as const;

export default function CareClient() {
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl">
      <section className="border-t border-[var(--hairline)] pt-8">
        <h2 className="font-display text-2xl text-[var(--text)]">
          {t("careIndiaTitle")}
        </h2>
        <ul className="mt-6 space-y-5">
          {HELPLINES.map((line) => (
            <li key={line.name} className="border-l-2 border-[var(--brass)]/50 pl-4">
              <p className="font-display text-lg text-[var(--text)]">{line.name}</p>
              <p className="mt-1 text-[15px] font-light text-[var(--text-muted)]">
                {line.detail}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm font-light leading-relaxed text-[var(--text-muted)]">
          {t("careDisclaimer")}
        </p>
      </section>

      <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--hairline)] pt-6">
        <Link
          href="/sangha"
          className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          ← {t("sanghaTitle")}
        </Link>
        <Link
          href="/"
          className="text-sm text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--brass-soft)] hover:underline"
        >
          {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
