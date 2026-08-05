"use client";

import Link from "next/link";
import ImmersiveHero from "@/components/ImmersiveHero";
import { useLanguage } from "@/components/LanguageProvider";

// Numbers stay literal; the descriptions go through i18n. This is the page a
// person in distress lands on — an English-only line here fails exactly the
// reader the crisis path exists for.
const HELPLINES = [
  { name: "tele-MANAS", detailKey: "careTeleManas" as const, tel: "14416" },
  { name: "iCall", detailKey: "careICall" as const, tel: "9152987821" },
  { name: "AASRA", detailKey: "careAasra" as const, tel: "9820466726" },
];

export default function CareClient() {
  const { t } = useLanguage();

  return (
    <div className="life-hub pb-10">
      {/* Quiet dawn register — mood.jpg, not community gathering. */}
      <ImmersiveHero
        compact
        image="/images/paths/mood.jpg"
        eyebrow={t("careEyebrow")}
        title={t("careTitle")}
        intro={t("careIntro")}
        actions={
          <a
            href="tel:14416"
            className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            tele-MANAS · 14416
          </a>
        }
      />

      <section>
        <p className="eyebrow text-[var(--brass)]">{t("careIndiaTitle")}</p>
        <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
          {t("careIndiaTitle")}
        </h2>
        <div className="med-hub__days mt-6">
          {HELPLINES.map((line) => (
            <a
              key={line.name}
              href={`tel:${line.tel}`}
              className="med-hub__day is-current"
            >
              <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                {line.tel}
              </p>
              <p className="mt-2 font-display text-xl text-[var(--text)]">
                {line.name}
              </p>
              <p className="mt-3 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                {t(line.detailKey)}
              </p>
            </a>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm font-light leading-relaxed text-[var(--text-muted)]">
          {t("careDisclaimer")}
        </p>
      </section>

      <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-muted)]">
        <Link
          href="/community"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          ← {t("sanghaTitle")}
        </Link>
        <Link
          href="/"
          className="underline-offset-2 transition hover:text-[var(--brass-soft)] hover:underline"
        >
          {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
