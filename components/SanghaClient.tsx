"use client";

// Renders /community (the WS6 Sangha → Community rename is UI-only; this
// file name and the sangha* i18n keys stay — they are user-invisible).
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { track } from "@/lib/track";

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL;
const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM_URL;

const linkClass =
  "min-h-11 inline-block border border-[var(--line)] px-5 py-3 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]";

export default function SanghaClient({
  microSevaHref,
}: {
  microSevaHref: string;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [attended, setAttended] = useState(false);

  function markAttended() {
    // The surface renamed Sangha → Community (WS6); the event name is
    // UI-independent history — G2 gate queries and recorded rows depend on
    // it, so it stays sangha_attended forever.
    track("sangha_attended", { source: "sangha_page" });
    setAttended(true);
  }

  const hasChannels = Boolean(WHATSAPP || TELEGRAM);

  return (
    <div className="max-w-2xl space-y-12">
      <section>
        {hasChannels ? (
          <div className="flex flex-wrap gap-3">
            {WHATSAPP ? (
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {t("sanghaJoinWhatsApp")}
              </a>
            ) : null}
            {TELEGRAM ? (
              <a
                href={TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {t("sanghaJoinTelegram")}
              </a>
            ) : null}
          </div>
        ) : (
          <p className="border-l-2 border-[var(--brass)]/60 pl-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
            {t("sanghaChannelsSoon")}
          </p>
        )}
      </section>

      <section className="border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl text-[var(--text)]">
          {t("sanghaLiveTitle")}
        </h2>
        <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {t("sanghaLiveBlurb")}
        </p>
        {attended ? (
          <p className="mt-5 text-sm text-[var(--brass-soft)]">
            {t("sanghaAttendedDone")}
          </p>
        ) : (
          <button
            type="button"
            onClick={markAttended}
            className="mt-5 min-h-11 bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            {t("sanghaAttended")}
          </button>
        )}
        {!user ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("sanghaAttendedSignIn")}{" "}
            <Link
              href="/account"
              className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        ) : null}
      </section>

      <section className="border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl text-[var(--text)]">
          {t("sanghaSevaTitle")}
        </h2>
        <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {t("sanghaSevaBlurb")}
        </p>
        <h3 className="mt-8 text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
          {t("microSevaTitle")}
        </h3>
        <p className="mt-2 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {t("microSevaBlurb")}
        </p>
        <Link
          href={microSevaHref}
          className="mt-4 inline-block text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("pathOpenVerse")} →
        </Link>
      </section>

      <section className="border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl text-[var(--text)]">
          {t("sanghaCareTitle")}
        </h2>
        <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {t("sanghaCareBlurb")}
        </p>
        <Link
          href="/care"
          className={`${linkClass} mt-5`}
        >
          {t("sanghaCareLink")}
        </Link>
      </section>

      <p className="border-t border-[var(--hairline)] pt-8">
        <Link
          href="/paths"
          className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("pathListTitle")} →
        </Link>
      </p>
    </div>
  );
}
