"use client";

// Renders /community (the WS6 Sangha → Community rename is UI-only; this
// file name and the sangha* i18n keys stay — they are user-invisible).
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ImmersiveHero from "@/components/ImmersiveHero";
import { useLanguage } from "@/components/LanguageProvider";
import { track } from "@/lib/track";

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL;
const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM_URL;

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
    <div className="life-hub pb-10">
      <ImmersiveHero
        image="/images/paths/community.jpg"
        eyebrow={t("sanghaEyebrow")}
        title={t("sanghaTitle")}
        intro={t("sanghaIntro")}
        actions={
          <>
            {WHATSAPP ? (
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("sanghaJoinWhatsApp")}
              </a>
            ) : null}
            {TELEGRAM ? (
              <a
                href={TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center border border-white/25 px-5 py-3 text-sm text-white/80 transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
              >
                {t("sanghaJoinTelegram")}
              </a>
            ) : null}
            {!hasChannels ? (
              <p className="max-w-md text-sm text-white/70">
                {t("sanghaChannelsSoon")}
              </p>
            ) : null}
          </>
        }
      />

      <div className="med-hub__days">
        <div className="med-hub__day is-current">
          <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
            {t("sanghaLiveTitle")}
          </p>
          <p className="mt-2 font-display text-xl text-[var(--text)]">
            {t("sanghaLiveTitle")}
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-[var(--text-muted)]">
            {t("sanghaLiveBlurb")}
          </p>
          <div className="mt-auto pt-5">
            {attended ? (
              <p className="text-sm text-[var(--brass-soft)]">
                {t("sanghaAttendedDone")}
              </p>
            ) : (
              <button
                type="button"
                onClick={markAttended}
                className="min-h-10 bg-[var(--brass)] px-4 py-2 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("sanghaAttended")}
              </button>
            )}
            {!user ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {t("sanghaAttendedSignIn")}{" "}
                <Link
                  href="/account"
                  className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
                >
                  {t("signIn")}
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <div className="med-hub__day">
          <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
            {t("sanghaSevaTitle")}
          </p>
          <p className="mt-2 font-display text-xl text-[var(--text)]">
            {t("microSevaTitle")}
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-[var(--text-muted)]">
            {t("microSevaBlurb")}
          </p>
          <Link
            href={microSevaHref}
            className="mt-auto pt-5 text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            {t("pathOpenVerse")} →
          </Link>
        </div>

        <div className="med-hub__day">
          <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
            {t("sanghaCareTitle")}
          </p>
          <p className="mt-2 font-display text-xl text-[var(--text)]">
            {t("sanghaCareTitle")}
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-[var(--text-muted)]">
            {t("sanghaCareBlurb")}
          </p>
          <Link
            href="/care"
            className="mt-auto pt-5 text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            {t("sanghaCareLink")} →
          </Link>
        </div>
      </div>

      <p className="mt-10 text-sm text-[var(--text-muted)]">
        <Link
          href="/paths"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("pathListTitle")}
        </Link>
        {" · "}
        <Link
          href="/meditation"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("pathBridgeMed")}
        </Link>
      </p>
    </div>
  );
}
