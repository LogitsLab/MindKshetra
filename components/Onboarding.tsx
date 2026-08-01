"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BRAND_NAME } from "@/components/BrandWordmark";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * First-visit onboarding (WS2) — shown on `/` only, client-side after
 * hydration, for signed-out visitors without the flag below. The flow shape is
 * ported from mobile (welcome → what's inside → language → join-or-guest);
 * auth reuses AuthProvider, language reuses LanguageProvider so every choice
 * here is the real setting, not a preview copy.
 *
 * Completing OR skipping sets the localStorage flag plus a cookie mirror (the
 * cookie is unused for rendering today; it keeps a future server-side variant
 * possible without a second migration of the flag).
 */
export const ONBOARDED_KEY = "mk-onboarded";

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    /* storage unavailable — the cookie below may still hold */
  }
  try {
    document.cookie = "mk-onboarded=1; max-age=31536000; path=/";
  } catch {
    /* ignore */
  }
}

const STEPS = ["welcome", "paths", "language", "begin"] as const;
type Step = (typeof STEPS)[number];

const PATH_PREVIEWS = [
  {
    titleKey: "onboardingPathExploreTitle",
    blurbKey: "onboardingPathExploreBlurb",
    image: "/images/paths/explore.jpg",
  },
  {
    titleKey: "onboardingPathMoodTitle",
    blurbKey: "onboardingPathMoodBlurb",
    image: "/images/paths/mood.jpg",
  },
  {
    titleKey: "onboardingPathMadhavTitle",
    blurbKey: "onboardingPathMadhavBlurb",
    image: "/images/paths/madhav.jpg",
  },
  {
    titleKey: "onboardingPathAstrologyTitle",
    blurbKey: "onboardingPathAstrologyBlurb",
    image: "/images/paths/astrology.jpg",
  },
  {
    titleKey: "onboardingPathSadhanaTitle",
    blurbKey: "onboardingPathSadhanaBlurb",
    image: "/images/paths/sadhana.jpg",
  },
] as const;

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { lang, setLang, t } = useLanguage();
  const { signInWithGoogle, signInWithEmail, signInAnonymously } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [busy, setBusy] = useState<"google" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestFailed, setGuestFailed] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  function finish() {
    markOnboarded();
    onDone();
  }

  function goBack() {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    // The OAuth redirect leaves this page: set the flag first so returning
    // visitors land on home, never back inside onboarding.
    markOnboarded();
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
    setBusy(null);
  }

  async function onGuest() {
    setError(null);
    setGuestFailed(false);
    setBusy("guest");
    const result = await signInAnonymously();
    setBusy(null);
    if (result.error) {
      // Never trap someone at the door: name the failure and open it anyway.
      setError(result.error);
      setGuestFailed(true);
      return;
    }
    finish();
  }

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailStatus("sending");
    const result = await signInWithEmail(email.trim());
    if (result.error) {
      setError(result.error);
      setEmailStatus("idle");
      return;
    }
    // The magic link completes sign-in whenever it is opened; onboarding is
    // done either way.
    markOnboarded();
    setEmailStatus("sent");
  }

  return (
    <div className="mx-auto max-w-xl animate-fade py-6 sm:py-12">
      {/* Progress track + back/skip — hairline segments, brass for the ground covered. */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className={`text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] ${
            stepIndex === 0 ? "invisible" : ""
          }`}
        >
          ← {t("onboardingBack")}
        </button>
        <div
          className="flex flex-1 items-center gap-1.5"
          role="img"
          aria-label={t("onboardingStepOf")
            .replace("{n}", String(stepIndex + 1))
            .replace("{total}", String(STEPS.length))}
        >
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-px flex-1 ${
                i <= stepIndex ? "bg-[var(--brass)]/70" : "bg-[var(--hairline)]"
              }`}
            />
          ))}
        </div>
        {step === "welcome" || step === "paths" ? (
          <button
            type="button"
            onClick={finish}
            className="text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {t("onboardingSkip")}
          </button>
        ) : (
          <span className="invisible text-xs">{t("onboardingSkip")}</span>
        )}
      </div>

      <div className="glass px-6 py-8 sm:px-8 sm:py-10">
        {step === "welcome" ? (
          <section>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("onboardingWelcomeEyebrow")}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-[var(--text)] sm:text-5xl">
              {BRAND_NAME}
            </h1>
            <p className="mt-3 font-display text-xl leading-snug text-[var(--brass-soft)] sm:text-2xl">
              {t("onboardingWelcomeTitle")}
            </p>
            <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
              {t("onboardingBrandStory")}
            </p>
            <button
              type="button"
              onClick={() => setStep("paths")}
              className="mt-8 min-h-11 bg-[var(--brass)] px-8 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("onboardingContinue")}
            </button>
          </section>
        ) : null}

        {step === "paths" ? (
          <section>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("onboardingPathsEyebrow")}
            </p>
            <h2 className="mt-2 font-display text-3xl text-[var(--text)]">
              {t("onboardingPathsTitle")}
            </h2>
            <ul className="mt-6 divide-y divide-[var(--hairline)]">
              {PATH_PREVIEWS.map((p) => (
                <li key={p.titleKey} className="flex items-center gap-4 py-3.5">
                  <span className="relative block h-12 w-12 shrink-0 overflow-hidden border border-[var(--line)]">
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover opacity-80"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg leading-snug text-[var(--text)]">
                      {t(p.titleKey)}
                    </span>
                    <span className="mt-0.5 block text-sm font-light leading-relaxed text-[var(--text-soft)]">
                      {t(p.blurbKey)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setStep("language")}
              className="mt-7 min-h-11 bg-[var(--brass)] px-8 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("onboardingContinue")}
            </button>
          </section>
        ) : null}

        {step === "language" ? (
          <section>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("onboardingLangEyebrow")}
            </p>
            <h2 className="mt-2 font-display text-3xl text-[var(--text)]">
              {t("onboardingLangTitle")}
            </h2>
            <p className="mt-3 max-w-md text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
              {t("onboardingLangBody")}
            </p>
            {/* The tap applies immediately — this whole screen is the live preview. */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              {(["en", "hi"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLang(option)}
                  aria-pressed={lang === option}
                  className={`min-h-12 border px-4 py-3 text-sm transition ${
                    lang === option
                      ? "border-[var(--brass)] text-[var(--brass-soft)]"
                      : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/50"
                  }`}
                >
                  {option === "en" ? t("onboardingLangEn") : t("onboardingLangHi")}
                  {lang === option ? (
                    <span className="mt-1 block text-xs text-[var(--brass)]">
                      {t("onboardingLangSelected")}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <p className="mt-5 border-l-2 border-[var(--brass)]/50 pl-4 font-display text-lg text-[var(--text)]">
              {lang === "hi"
                ? t("onboardingLangPreviewHi")
                : t("onboardingLangPreviewEn")}
            </p>
            <button
              type="button"
              onClick={() => setStep("begin")}
              className="mt-7 min-h-11 bg-[var(--brass)] px-8 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("onboardingContinue")}
            </button>
          </section>
        ) : null}

        {step === "begin" ? (
          <section>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("onboardingAuthEyebrow")}
            </p>
            <h2 className="mt-2 font-display text-3xl text-[var(--text)]">
              {t("onboardingAuthTitle")}
            </h2>
            <p className="mt-3 max-w-md text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
              {t("onboardingAuthBody")}
            </p>

            <div className="mt-7 space-y-4">
              <button
                type="button"
                onClick={() => void onGoogle()}
                disabled={busy !== null}
                className="flex min-h-12 w-full items-center justify-center gap-3 bg-[var(--brass)] px-4 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 48 48"
                  aria-hidden
                  className="shrink-0"
                >
                  <path
                    fill="currentColor"
                    d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.7-.5-4z"
                  />
                </svg>
                {busy === "google" ? t("loading") : t("signInGoogle")}
              </button>

              {emailStatus === "sent" ? (
                <div className="space-y-3 border border-[var(--brass)]/35 bg-[var(--brass)]/8 px-4 py-5">
                  <p className="text-sm leading-relaxed text-[var(--brass-soft)]">
                    {t("magicLinkSent")}
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                    {t("magicLinkHint")}
                  </p>
                  <button
                    type="button"
                    onClick={finish}
                    className="min-h-11 bg-[var(--brass)] px-6 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
                  >
                    {t("onboardingGetStarted")}
                  </button>
                </div>
              ) : emailOpen ? (
                <form onSubmit={onEmailSubmit} className="space-y-3">
                  <label className="block space-y-2">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {t("emailLabel")}
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("emailPlaceholder")}
                      className="w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)]/55 focus:border-[var(--brass)]/55"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={emailStatus === "sending" || !email.trim()}
                    className="w-full min-h-11 border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] disabled:opacity-50"
                  >
                    {emailStatus === "sending" ? t("sendingLink") : t("signInEmail")}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEmailOpen(true)}
                  className="w-full min-h-11 border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
                >
                  {t("useEmailInstead")}
                </button>
              )}

              <button
                type="button"
                onClick={() => void onGuest()}
                disabled={busy !== null}
                className="w-full min-h-11 text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50"
              >
                {busy === "guest" ? t("loading") : t("guest")}
              </button>

              {error ? (
                <p
                  className="text-sm leading-relaxed text-[var(--danger)]"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              {guestFailed ? (
                <button
                  type="button"
                  onClick={finish}
                  className="w-full text-center text-sm text-[var(--brass-soft)] underline-offset-4 hover:underline"
                >
                  {t("onboardingEnterAnyway")}
                </button>
              ) : null}

              <p className="text-xs leading-relaxed text-[var(--text-muted)]/80">
                {t("onboardingGuestNote")}
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
