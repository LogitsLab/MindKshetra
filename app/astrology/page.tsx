"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BirthForm from "@/components/astrology/BirthForm";
import ChartHub from "@/components/astrology/ChartHub";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChartPayload } from "@/lib/astrology/types";

const SESSION_KEY = "mindkshetra-astro-incognito";

export default function AstrologyLanding() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const signedIn = Boolean(user && !user.is_anonymous);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (!existing) {
      setRestoring(false);
      return;
    }
    fetch("/api/astrology/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: existing }),
    })
      .then(async (res) => {
        if (!res.ok) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }
        const data = await res.json();
        setSessionId(data.sessionId);
        setChart(data.chart);
      })
      .catch(() => {
        sessionStorage.removeItem(SESSION_KEY);
      })
      .finally(() => setRestoring(false));
  }, []);

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setChart(null);
    setError(null);
  }

  if (restoring) {
    return (
      <p className="py-20 text-center text-sm text-[var(--text-muted)]">
        {t("loading")}
      </p>
    );
  }

  if (chart && sessionId) {
    return (
      <div className="py-8 sm:py-12">
        <div className="mx-auto mb-6 flex max-w-3xl justify-end">
          <button
            type="button"
            onClick={clearSession}
            className="text-sm text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
          >
            {t("astroNewChart")}
          </button>
        </div>
        <ChartHub
          chart={chart}
          title={chart.birth.name || t("astroGuestChart")}
          subtitle={`${chart.birth.dob} · ${chart.birth.placeLabel}`}
          incognito
          sessionId={sessionId}
          onRequestPredictions={async (force) => {
            const res = await fetch("/api/astrology/predictions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, language: lang, force }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setChart(data.chart);
            return data.chart;
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <section className="relative overflow-hidden pb-4 pt-10 sm:pb-6 sm:pt-14">
        <p
          className="pointer-events-none absolute -right-4 top-8 select-none font-display text-[clamp(4rem,18vw,9rem)] leading-none text-[var(--brass)]/[0.07] sm:right-8"
          aria-hidden
        >
          ज्योतिष
        </p>
        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="animate-rise text-xs uppercase tracking-[0.28em] text-[var(--brass)]">
            {t("astroEyebrow")}
          </p>
          <h1 className="animate-rise-delay-1 mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl">
            {t("astroTitle")}
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
            {t("astroIntroNew")}
          </p>

          <div className="animate-rise-delay-3 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              href={signedIn ? "/astrology/members" : "/account"}
              className="text-[var(--brass-soft)] underline-offset-4 transition hover:underline"
            >
              {signedIn ? t("astroManageLink") : t("astroSignInToSave")}
            </Link>
            {signedIn ? (
              <Link
                href="/astrology/members/new"
                className="text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--text)] hover:underline"
              >
                {t("astroSaveAsMember")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl pb-16 pt-2">
        <div className="animate-rise-delay-3 border border-[var(--brass)]/25 bg-[var(--panel)]/80 px-4 py-6 backdrop-blur-sm sm:px-8 sm:py-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--hairline)] pb-4">
            <div>
              <h2 className="font-display text-2xl text-[var(--text)]">
                {t("astroCastTitle")}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t("astroCastBlurb")}
              </p>
            </div>
            <p className="max-w-[14rem] text-right text-xs leading-snug text-[var(--brass-soft)]">
              {t("astroIncognitoBanner")}
            </p>
          </div>

          {error ? (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <BirthForm
            mode="incognito"
            compact
            submitLabel={t("astroCast")}
            onSubmit={async (values) => {
              setError(null);
              const res = await fetch("/api/astrology/compute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...values,
                  gender: values.gender || null,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Compute failed");
              sessionStorage.setItem(SESSION_KEY, data.sessionId);
              setSessionId(data.sessionId);
              setChart(data.chart);
            }}
          />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          {t("astroEngineNote")}
        </p>
      </section>
    </div>
  );
}
