"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BirthForm from "@/components/astrology/BirthForm";
import ChartHub from "@/components/astrology/ChartHub";
import ZodiacRing from "@/components/astrology/ZodiacRing";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChartPayload } from "@/lib/astrology/types";

const SESSION_KEY = "mindkshetra-astro-incognito";
const PENDING_SAVE_KEY = "mindkshetra-astro-pending-save";
const RETURN_TO_KEY = "mindkshetra-return-to";

/**
 * sessionStorage shape. The field stays `sessionId` deliberately: renaming it
 * would invalidate every live incognito chart on deploy for zero benefit. The
 * WIRE field is `chartSessionId` (see lib/astrology/incognito.ts).
 */
type StoredSession = {
  sessionId: string;
  birth?: ChartPayload["birth"];
};

type PendingSave = {
  name: string;
  relationship: string;
  dob: string;
  tob: string | null;
  tobUnknown: boolean;
  gender: string | null;
  placeLabel: string;
  lat: number;
  lng: number;
  ianaTz: string;
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

export default function AstrologyLanding() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const signedIn = Boolean(user && !user.is_anonymous);
  const [chartSessionId, setChartSessionId] = useState<string | null>(null);
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
        chartSessionId: existing.sessionId,
        ...(existing.birth ? { birth: existing.birth } : {}),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // Legacy entries without `birth` cannot rehydrate; the server says so
          // via `recoverable`. Either way the chart is gone — say it, don't
          // just blank the page.
          sessionStorage.removeItem(SESSION_KEY);
          setNotice(t("astroSessionExpiredNotice"));
          return;
        }
        const data = await res.json();
        // Accept either name while the previous server build may still be live.
        const id = data.chartSessionId ?? data.sessionId;
        setChartSessionId(id);
        setChart(data.chart);
        if (data.chart?.birth) {
          writeStoredSession(id, data.chart.birth);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(SESSION_KEY);
        setNotice(t("astroSessionExpiredNotice"));
      })
      .finally(() => setRestoring(false));
    // t is stable enough for a mount-only effect; re-running on language
    // switch would re-POST the chart for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let pending: PendingSave | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_SAVE_KEY);
      if (!raw) return;
      pending = JSON.parse(raw) as PendingSave;
    } catch {
      sessionStorage.removeItem(PENDING_SAVE_KEY);
      return;
    }
    if (!pending?.dob) return;

    let cancelled = false;
    setSaveBusy(true);
    fetch("/api/astrology/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        sessionStorage.removeItem(PENDING_SAVE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        if (!cancelled) {
          router.push(`/astrology/members/${data.member.id}`);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Save failed");
          setSaveBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn, router]);

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    setChartSessionId(null);
    setChart(null);
    setError(null);
  }

  async function postMemberSave(payload: PendingSave) {
    const res = await fetch("/api/astrology/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PENDING_SAVE_KEY);
    router.push(`/astrology/members/${data.member.id}`);
  }

  async function saveAsMember() {
    if (!chart) return;
    const payload: PendingSave = {
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
    };
    if (!signedIn) {
      sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(payload));
      sessionStorage.setItem(RETURN_TO_KEY, "/astrology");
      router.push("/account?intent=save-chart");
      return;
    }
    setSaveBusy(true);
    setError(null);
    try {
      await postMemberSave(payload);
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

  if (chart && chartSessionId) {
    return (
      <div className="animate-fade py-6 sm:py-10">
        <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 lg:max-w-none">
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : (
            <span className="eyebrow text-[var(--brass)]">
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
          chartSessionId={chartSessionId}
          showGuidedPath
          onSaveAsMember={saveAsMember}
          saveBusy={saveBusy}
          onAsOfDateChange={async (asOfDate) => {
            const res = await fetch("/api/astrology/compute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chartSessionId,
                birth: chart.birth,
                asOfDate,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setChart(data.chart);
            return data.chart;
          }}
          onRequestPredictions={async (force) => {
            const res = await fetch("/api/astrology/predictions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chartSessionId,
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
      {/*
       * Single beat — the form IS the hero. Two columns at md+ (headline left,
       * cast form right); on mobile the form sits directly under a short
       * headline. No full-viewport hero, no anchor CTA, no fake step ribbon.
       */}
      <section className="relative overflow-hidden py-10 sm:py-14">
        <ZodiacRing className="astro-zodiac-ring pointer-events-none absolute -left-32 top-8 hidden h-[30rem] w-[30rem] text-[var(--brass)] opacity-[0.1] md:block" />

        <p
          className="watermark-sanskrit pointer-events-none absolute bottom-[6%] left-[2%] hidden select-none font-devanagari text-[clamp(4rem,12vw,8rem)] leading-none md:block"
          aria-hidden
        >
          ज्योतिष
        </p>

        <div className="relative z-10 grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start lg:gap-16">
          {/* Left column — headline, value prop, privacy line */}
          <div className="md:sticky md:top-24 md:pt-6">
            <p className="eyebrow animate-rise mb-3 text-[var(--brass)]">
              {t("astroEyebrow")}
            </p>
            <h1 className="animate-rise-delay-1 font-display text-4xl font-semibold leading-[0.98] tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
              {t("astroTitle")}
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-md font-display text-lg leading-snug text-[var(--brass-soft)] sm:text-xl">
              {t("astroTagline")}
            </p>
            <p className="animate-rise-delay-3 mt-3 hidden max-w-md text-[0.95rem] font-light leading-relaxed text-[var(--text-muted)] md:block">
              {t("astroIntroNew")}
            </p>
            <p className="animate-rise-delay-3 mt-4 max-w-md text-[11px] leading-relaxed text-[var(--brass-soft)] md:mt-5">
              {t("astroIncognitoBanner")}
            </p>

            <div className="animate-rise-delay-3 mt-8 hidden flex-wrap items-center gap-3 md:flex">
              <Link
                href={signedIn ? "/astrology/members" : "/account"}
                className="min-h-11 border border-[var(--line)] px-5 py-3 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--text)]"
              >
                {signedIn ? t("astroManageLink") : t("astroSignInToSave")}
              </Link>
              {signedIn ? (
                <Link
                  href="/astrology/milan"
                  className="min-h-11 border border-[var(--line)] px-5 py-3 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--text)]"
                >
                  {t("milanEyebrow")}
                </Link>
              ) : null}
            </div>
          </div>

          {/* Right column — the cast form, above the fold */}
          <div
            id="cast"
            className="panel scroll-mt-24 border border-[var(--line)] p-5 sm:p-7"
          >
            <h2 className="font-display text-2xl tracking-tight text-[var(--text)] sm:text-3xl">
              {t("astroCastTitle")}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
              {t("astroCastBlurb")}
            </p>

            {notice ? (
              <p
                className="mt-4 border border-[var(--brass)]/25 bg-[var(--brass)]/5 px-3 py-2.5 text-sm text-[var(--brass-soft)]"
                role="status"
              >
                {notice}
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-6">
              <BirthForm
                mode="incognito"
                compact
                submitLabel={t("astroCast")}
                onSubmit={async (values) => {
                  setError(null);
                  setNotice(null);
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
                  const id = data.chartSessionId ?? data.sessionId;
                  writeStoredSession(id, data.chart.birth);
                  setChartSessionId(id);
                  setChart(data.chart);
                }}
              />
            </div>

            <p className="mt-6 text-[11px] leading-relaxed tracking-wide text-[var(--text-muted)]">
              {t("astroEngineNote")}
            </p>

            {signedIn ? (
              <p className="mt-3 text-sm">
                <Link
                  href="/astrology/members/new"
                  className="text-[var(--brass-soft)] underline-offset-4 hover:underline"
                >
                  {t("astroSaveAsMember")}
                </Link>
              </p>
            ) : null}
          </div>

          {/* Secondary links repeat under the form on mobile only */}
          <div className="flex flex-wrap items-center gap-3 md:hidden">
            <Link
              href={signedIn ? "/astrology/members" : "/account"}
              className="min-h-11 border border-[var(--line)] px-5 py-3 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--text)]"
            >
              {signedIn ? t("astroManageLink") : t("astroSignInToSave")}
            </Link>
            {signedIn ? (
              <Link
                href="/astrology/milan"
                className="min-h-11 border border-[var(--line)] px-5 py-3 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--text)]"
              >
                {t("milanEyebrow")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
