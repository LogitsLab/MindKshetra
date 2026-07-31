"use client";

import { useLanguage } from "@/components/LanguageProvider";
import transparency from "@/data/transparency.json";

/**
 * Links are env-driven so the page ships before the accounts exist and
 * lights up via configuration alone: set the NEXT_PUBLIC_* var, redeploy,
 * done. Store policy note: this page is web-only by design — no donate
 * UI or links may ship inside the mobile binaries.
 */
const GITHUB_SPONSORS = process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL;
const OPEN_COLLECTIVE = process.env.NEXT_PUBLIC_OPEN_COLLECTIVE_URL;
const UPI_DONATION = process.env.NEXT_PUBLIC_RAZORPAY_DONATION_URL;
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL;
const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM_URL;

const linkClass =
  "min-h-11 inline-block border border-[var(--line)] px-5 py-3 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]";

export default function SupportClient() {
  const { lang, t } = useLanguage();

  return (
    <div className="max-w-2xl">
      <p className="text-[17px] font-light leading-relaxed text-[var(--text-muted)]">
        {t("supportIntro")}
      </p>
      <p className="mt-4 border-l-2 border-[var(--brass)]/60 pl-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
        {t("supportNoLock")}
      </p>

      <section className="mt-12 border-t border-[var(--hairline)] pt-8">
        <h2 className="font-display text-2xl text-[var(--text)]">
          {t("supportGive")}
        </h2>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("supportIndia")}
          </p>
          {UPI_DONATION ? (
            <a
              href={UPI_DONATION}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} mt-3`}
            >
              {t("supportIndiaUpi")}
            </a>
          ) : (
            <p className="mt-2 text-[15px] font-light text-[var(--text-muted)]">
              {t("supportIndiaSoon")}
            </p>
          )}
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("supportIntl")}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {GITHUB_SPONSORS ? (
              <a
                href={GITHUB_SPONSORS}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                GitHub Sponsors
              </a>
            ) : null}
            {OPEN_COLLECTIVE ? (
              <a
                href={OPEN_COLLECTIVE}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Open Collective
              </a>
            ) : null}
            {!GITHUB_SPONSORS && !OPEN_COLLECTIVE ? (
              <p className="text-[15px] font-light text-[var(--text-muted)]">
                {t("supportIndiaSoon")}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-12 border-t border-[var(--hairline)] pt-8">
        <h2 className="font-display text-2xl text-[var(--text)]">
          {t("supportTransparency")}
        </h2>
        <p className="mt-2 text-[15px] font-light text-[var(--text-muted)]">
          {t("supportTransparencyNote")}
        </p>
        <dl className="mt-6">
          {transparency.items.map((item) => (
            <div
              key={item.id}
              className="flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] py-3"
            >
              <dt className="text-[15px] text-[var(--text-muted)]">
                {lang === "hi" ? item.label_hi : item.label_en}
              </dt>
              <dd className="text-[15px] tabular-nums text-[var(--text)]">
                {item.amount ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {t("supportUpdated")}: {transparency.updated}
        </p>
      </section>

      {WHATSAPP || TELEGRAM ? (
        <section className="mt-12 border-t border-[var(--hairline)] pt-8">
          <h2 className="font-display text-2xl text-[var(--text)]">
            {t("supportCommunity")}
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {WHATSAPP ? (
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                WhatsApp
              </a>
            ) : null}
            {TELEGRAM ? (
              <a
                href={TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Telegram
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <p className="mt-12 border-t border-[var(--hairline)] pt-6 text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
        {t("supportAgpl")}
      </p>
    </div>
  );
}
