"use client";

import Link from "next/link";
import ImmersiveHero from "@/components/ImmersiveHero";
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

const outlineBtn =
  "inline-flex min-h-11 items-center border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]";

export default function SupportClient() {
  const { lang, t } = useLanguage();
  const primaryGive = UPI_DONATION || GITHUB_SPONSORS || OPEN_COLLECTIVE;

  return (
    <div className="life-hub pb-10">
      <ImmersiveHero
        image="/images/paths/community.jpg"
        eyebrow={t("supportEyebrow")}
        title={t("supportTitle")}
        intro={t("supportIntro")}
        meta={
          <p className="text-sm text-white/70">{t("supportNoLock")}</p>
        }
        actions={
          primaryGive ? (
            <a
              href={primaryGive}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("supportGive")}
            </a>
          ) : (
            <p className="text-sm text-white/70">{t("supportRailsPending")}</p>
          )
        }
      />

      <section className="life-hub__panel mb-10">
        <p className="eyebrow text-[var(--brass)]">{t("supportSustainerTitle")}</p>
        <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
          {t("supportSustainerTitle")}
        </h2>
        <p className="mt-3 max-w-xl text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {t("supportSustainerBody")}
        </p>
      </section>

      <section>
        <p className="eyebrow text-[var(--brass)]">{t("supportGive")}</p>
        <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
          {t("supportGive")}
        </h2>
        <div className="med-hub__days mt-6">
          <div className="med-hub__day is-current">
            <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
              {t("supportIndia")}
            </p>
            <p className="mt-2 font-display text-xl text-[var(--text)]">
              {t("supportIndia")}
            </p>
            <div className="mt-auto pt-5">
              {UPI_DONATION ? (
                <a
                  href={UPI_DONATION}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center bg-[var(--brass)] px-4 py-2 text-sm font-medium text-[var(--on-brass)]"
                >
                  {t("supportIndiaUpi")}
                </a>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("supportIndiaSoon")}
                </p>
              )}
            </div>
          </div>

          <div className="med-hub__day">
            <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
              {t("supportIntl")}
            </p>
            <p className="mt-2 font-display text-xl text-[var(--text)]">
              {t("supportIntl")}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {GITHUB_SPONSORS ? (
                <a
                  href={GITHUB_SPONSORS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={outlineBtn}
                >
                  GitHub Sponsors
                </a>
              ) : null}
              {OPEN_COLLECTIVE ? (
                <a
                  href={OPEN_COLLECTIVE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={outlineBtn}
                >
                  Open Collective
                </a>
              ) : null}
              {!GITHUB_SPONSORS && !OPEN_COLLECTIVE ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("supportIndiaSoon")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <p className="eyebrow text-[var(--brass)]">{t("supportTransparency")}</p>
        <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
          {t("supportTransparency")}
        </h2>
        <p className="mt-2 max-w-xl text-[15px] font-light text-[var(--text-muted)]">
          {t("supportTransparencyNote")}
        </p>
        <dl className="life-hub__panel mt-6">
          {transparency.items.map((item) => (
            <div
              key={item.id}
              className="flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] py-3 first:border-t-0 first:pt-0"
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
        <section className="mt-12">
          <p className="eyebrow text-[var(--brass)]">{t("supportCommunity")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {WHATSAPP ? (
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className={outlineBtn}
              >
                WhatsApp
              </a>
            ) : null}
            {TELEGRAM ? (
              <a
                href={TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className={outlineBtn}
              >
                Telegram
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <p className="mt-12 max-w-2xl text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
        {t("supportAgpl")}
      </p>
      <p className="mt-6 text-sm text-[var(--text-muted)]">
        <Link
          href="/community"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("sanghaTitle")}
        </Link>
      </p>
    </div>
  );
}
