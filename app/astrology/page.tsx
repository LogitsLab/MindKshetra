"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BirthForm from "@/components/astrology/BirthForm";
import ChartHub from "@/components/astrology/ChartHub";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChartPayload } from "@/lib/astrology/types";

const SESSION_KEY = "mindkshetra-astro-incognito";

type StoredSession = {
  sessionId: string;
  birth?: ChartPayload["birth"];
};

function readStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    if (!raw.startsWith("{")) return { sessionId: raw };
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeStoredSession(sessionId: string, birth: ChartPayload["birth"]) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ sessionId, birth } satisfies StoredSession)
  );
}

function ZodiacRing({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden fill="none">
      <circle
        cx="120"
        cy="120"
        r="108"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="3 8"
        opacity="0.5"
      />
      <circle
        cx="120"
        cy="120"
        r="86"
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.28"
      />
      <circle
        cx="120"
        cy="120"
        r="58"
        stroke="currentColor"
        strokeWidth="0.35"
        opacity="0.18"
      />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const x = 120 + Math.cos(rad) * 108;
        const y = 120 + Math.sin(rad) * 108;
        return (
          <circle
            key={deg}
            cx={x}
            cy={y}
            r={deg % 90 === 0 ? 2 : 1.2}
            fill="currentColor"
            opacity={deg % 90 === 0 ? 0.75 : 0.4}
          />
        );
      })}
      <path
        d="M120 22 L128 42 L120 36 L112 42 Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

export default function AstrologyLanding() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const signedIn = Boolean(user && !user.is_anonymous);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    const existing = readStoredSession();
    if (!existing?.sessionId) {
      setRestoring(false);
      return;
    }
    fetch("/api/astrology/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: existing.sessionId,
        ...(existing.birth ? { birth: existing.birth } : {}),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }
        const data = await res.json();
        setSessionId(data.sessionId);
        setChart(data.chart);
        if (data.chart?.birth) {
          writeStoredSession(data.sessionId, data.chart.birth);
        }
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

  async function saveAsMember() {
    if (!chart) return;
    if (!signedIn) {
      setError(t("astroSaveGuestNeedAuth"));
      router.push("/account");
      return;
    }
    setSaveBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/astrology/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: chart.birth.name?.trim() || t("astroGuestChart"),
          relationship: "self",
          dob: chart.birth.dob,
          tob: chart.birth.tob,
          tobUnknown: chart.tobUnknown,
          gender: chart.birth.gender || null,
          placeLabel: chart.birth.placeLabel,
          lat: chart.birth.lat,
          lng: chart.birth.lng,
          ianaTz: chart.birth.ianaTz,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      sessionStorage.removeItem(SESSION_KEY);
      router.push(`/astrology/members/${data.member.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }

  if (restoring) {
    return (
      <p className="py-28 text-center text-sm tracking-[0.18em] text-[var(--text-muted)]">
        {t("loading")}
      </p>
    );
  }

  if (chart && sessionId) {
    return (
      <div className="animate-fade py-6 sm:py-10">
        <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3">
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : (
            <span className="text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brass)]">
              {t("astroEyebrow")}
            </span>
          )}
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
          showGuidedPath
          onSaveAsMember={saveAsMember}
          saveBusy={saveBusy}
          onRequestPredictions={async (force) => {
            const res = await fetch("/api/astrology/predictions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                language: lang,
                force,
                birth: chart.birth,
              }),
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
      {/* Beat 1 — brand hero (matches home cinematic weight) */}
      <section className="relative flex min-h-[min(78dvh,40rem)] flex-col justify-center overflow-hidden py-12 sm:min-h-[min(82dvh,44rem)] sm:py-16">
        <div className="hero-bleed pointer-events-none absolute inset-y-0 -z-10">
          <div
            className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/30"
            aria-hidden
          />
        </div>

        <ZodiacRing className="astro-zodiac-ring pointer-events-none absolute -right-20 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 text-[var(--brass)] opacity-[0.18] sm:-right-10 sm:h-[34rem] sm:w-[34rem]" />

        <p
          className="watermark-sanskrit pointer-events-none absolute right-[4%] top-[18%] select-none font-display text-[clamp(5rem,20vw,10rem)] leading-none"
          aria-hidden
        >
          ज्योतिष
        </p>

        <div className="relative z-10 max-w-3xl">
          <p className="animate-rise mb-4 text-xs uppercase tracking-[0.32em] text-[var(--brass)] sm:text-sm">
            {t("astroEyebrow")}
          </p>
          <h1 className="animate-rise-delay-1 font-display text-[2.75rem] font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl md:text-8xl">
            {t("astroTitle")}
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-xl font-display text-lg leading-snug text-[var(--brass-hover)] sm:mt-6 sm:text-2xl">
            {t("astroTagline")}
          </p>
          <p className="animate-rise-delay-3 mt-4 max-w-lg text-[0.95rem] font-light leading-relaxed text-white/75 sm:text-lg">
            {t("astroIntroNew")}
          </p>

          <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
            <a
              href="#cast"
              className="min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("astroCast")}
            </a>
            <Link
              href={signedIn ? "/astrology/members" : "/account"}
              className="min-h-11 border border-white/25 px-5 py-3 text-sm text-white/85 transition hover:border-[var(--brass)]/50 hover:text-white"
            >
              {signedIn ? t("astroManageLink") : t("astroSignInToSave")}
            </Link>
          </div>
        </div>
      </section>

      {/* Beat 2 — cast form */}
      <section
        id="cast"
        className="relative scroll-mt-24 border-t border-[var(--brass)]/20 pb-20 pt-12 sm:pt-16"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brass-soft)]">
                {t("astroCastStep")}
              </p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-[var(--text)] sm:text-4xl">
                {t("astroCastTitle")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                {t("astroCastBlurb")}
              </p>
            </div>
            <p className="max-w-[12rem] text-right text-[11px] leading-relaxed text-[var(--brass-soft)]">
              {t("astroIncognitoBanner")}
            </p>
          </div>

          {/* Quiet step labels */}
          <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <span className="font-display text-[var(--brass-soft)]">01</span>
              {t("astroStepBirth")}
            </li>
            <li className="flex items-center gap-2">
              <span className="font-display text-[var(--brass-soft)]">02</span>
              {t("astroStepPlace")}
            </li>
            <li className="flex items-center gap-2">
              <span className="font-display text-[var(--brass-soft)]">03</span>
              {t("astroStepCast")}
            </li>
          </ol>

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
              writeStoredSession(data.sessionId, data.chart.birth);
              setSessionId(data.sessionId);
              setChart(data.chart);
            }}
          />

          <p className="mt-10 text-center text-[11px] leading-relaxed tracking-wide text-[var(--text-muted)]">
            {t("astroEngineNote")}
          </p>

          {signedIn ? (
            <p className="mt-4 text-center text-sm">
              <Link
                href="/astrology/members/new"
                className="text-[var(--brass-soft)] underline-offset-4 hover:underline"
              >
                {t("astroSaveAsMember")}
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
