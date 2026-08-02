"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

// Numbers stay literal; the descriptions go through i18n. This is the page a
// person in distress lands on — an English-only line here fails exactly the
// reader the crisis path exists for.
const HELPLINES = [
  { name: "tele-MANAS", detailKey: "careTeleManas" },
  { name: "iCall", detailKey: "careICall" },
  { name: "AASRA", detailKey: "careAasra" },
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
                {t(line.detailKey)}
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
          href="/community"
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
