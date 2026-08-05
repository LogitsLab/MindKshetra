"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import {
  INCOGNITO_SESSION_KEY,
  parseStoredBirth,
  usePredictions,
  type PredictionsLang,
} from "@/components/astrology/usePredictions";
import type {
  AreaPrediction,
  AstrologyMember,
  ChartPayload,
  LifeArea,
} from "@/lib/astrology/types";

type ChartSource =
  | { kind: "member"; id: string; name: string }
  | { kind: "incognito"; sessionId: string; birth?: ChartPayload["birth"] };

type RangeTab = "overall" | "marriage" | "career" | "health" | "finance";

const RANGE_TABS: RangeTab[] = [
  "overall",
  "marriage",
  "career",
  "health",
  "finance",
];

function readIncognito(): ChartSource | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INCOGNITO_SESSION_KEY);
    if (!raw) return null;
    if (!raw.startsWith("{")) {
      return { kind: "incognito", sessionId: raw };
    }
    const parsed = JSON.parse(raw) as {
      sessionId?: string;
      birth?: ChartPayload["birth"];
    };
    if (!parsed.sessionId) return null;
    return {
      kind: "incognito",
      sessionId: parsed.sessionId,
      birth: parsed.birth ?? parseStoredBirth(raw) ?? undefined,
    };
  } catch {
    return null;
  }
}

function areaLabel(area: LifeArea | "overall", lang: "en" | "hi"): string {
  const en: Record<string, string> = {
    overall: "Overall",
    marriage: "Love",
    career: "Career",
    health: "Health",
    finance: "Finance",
    education: "Education",
    travel: "Travel",
  };
  const hi: Record<string, string> = {
    overall: "समग्र",
    marriage: "प्रेम",
    career: "करियर",
    health: "स्वास्थ्य",
    finance: "वित्त",
    education: "शिक्षा",
    travel: "यात्रा",
  };
  return (lang === "hi" ? hi : en)[area] ?? area;
}

export default function HoroscopeClient() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const L: PredictionsLang = lang === "hi" ? "hi" : "en";
  const signedIn = Boolean(user && !user.is_anonymous);

  const [members, setMembers] = useState<AstrologyMember[]>([]);
  const [source, setSource] = useState<ChartSource | null>(null);
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeTab>("overall");
  const [horizon, setHorizon] = useState<"now" | "near">("now");

  const chartKey = useMemo(() => {
    if (!source) return "";
    return source.kind === "member"
      ? `m:${source.id}`
      : `i:${source.sessionId}`;
  }, [source]);

  const {
    busy,
    stage,
    error: predError,
    errorKind,
    predictionsByLang,
    load,
  } = usePredictions({
    chartSessionId:
      source?.kind === "incognito" ? source.sessionId : undefined,
    memberId: source?.kind === "member" ? source.id : undefined,
    birth:
      source?.kind === "incognito"
        ? source.birth
        : chart?.birth ?? undefined,
    chartKey,
    initialText: chart?.predictionsText ?? null,
  });

  const predText = predictionsByLang[L];

  useEffect(() => {
    let alive = true;
    (async () => {
      const incog = readIncognito();
      let list: AstrologyMember[] = [];
      if (signedIn) {
        try {
          const res = await fetch("/api/astrology/members");
          if (res.ok) {
            const data = await res.json();
            list = (data.members as AstrologyMember[]) ?? [];
          }
        } catch {
          /* guest path */
        }
      }
      if (!alive) return;
      setMembers(list);
      const first: ChartSource | null =
        list[0]
          ? { kind: "member", id: list[0].id, name: list[0].name }
          : incog;
      setSource(first);
      if (!first) setLoadingChart(false);
    })();
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const loadChart = useCallback(async (src: ChartSource) => {
    setLoadingChart(true);
    setError(null);
    setChart(null);
    try {
      let res: Response;
      if (src.kind === "member") {
        res = await fetch(`/api/astrology/members/${src.id}/chart`);
        if (!res.ok) {
          res = await fetch("/api/astrology/compute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: src.id }),
          });
        }
      } else {
        res = await fetch("/api/astrology/compute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chartSessionId: src.sessionId,
            ...(src.birth ? { birth: src.birth } : {}),
          }),
        });
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : L === "hi"
              ? "चार्ट लोड नहीं हो सका"
              : "Could not load chart"
        );
      }
      const data = await res.json();
      setChart(data.chart as ChartPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoadingChart(false);
    }
  }, [L]);

  useEffect(() => {
    if (!source) return;
    void loadChart(source);
  }, [source, loadChart]);

  useEffect(() => {
    if (!source || !chart || predText || busy || errorKind) return;
    void load(L, { auto: true });
  }, [source, chart, predText, busy, errorKind, load, L]);

  const areaRow: AreaPrediction | null =
    range === "overall" ? null : predText?.areas?.[range] ?? null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/astrology" className="text-sm text-[var(--text-muted)]">
        ← {t("astroTitle") || (L === "hi" ? "ज्योतिष" : "Astrology")}
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        {L === "hi" ? "राशिफल" : "Horoscope insights"}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        {L === "hi"
          ? "मार्गदर्शन आपके चार्ट तथ्यों से आता है — कल्पित ग्रह नहीं।"
          : "Guidance is narrated from your chart facts — never invented placements."}
      </p>

      {!source && !loadingChart ? (
        <div className="mt-8 space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            {L === "hi"
              ? "पढ़ने के लिए चार्ट चुनें या बनाएँ।"
              : "Cast or open a chart to read life-area insights."}
          </p>
          <Link
            href="/astrology"
            className="block rounded-md border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-3 text-sm text-[var(--brass-soft)]"
          >
            {L === "hi" ? "ज्योतिष केंद्र" : "Open Astrology hub"}
          </Link>
          <Link
            href="/astrology/members"
            className="block rounded-md border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-soft)]"
          >
            {L === "hi" ? "सहेजे सदस्य" : "Saved members"}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  setSource({ kind: "member", id: m.id, name: m.name })
                }
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  source?.kind === "member" && source.id === m.id
                    ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/40"
                }`}
              >
                {m.name}
              </button>
            ))}
            {readIncognito() ? (
              <button
                type="button"
                onClick={() => {
                  const inc = readIncognito();
                  if (inc) setSource(inc);
                }}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  source?.kind === "incognito"
                    ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/40"
                }`}
              >
                {L === "hi" ? "गुप्त चार्ट" : "Incognito"}
              </button>
            ) : null}
          </div>

          {loadingChart ? (
            <p className="mt-8 text-sm text-[var(--text-muted)]">
              {L === "hi" ? "चार्ट लोड हो रहा है…" : "Loading chart…"}
            </p>
          ) : error ? (
            <p className="mt-8 text-sm text-[var(--text-muted)]">{error}</p>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-1 border border-[var(--line)] p-0.5">
                {RANGE_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRange(tab)}
                    className={`px-3 py-1.5 text-xs transition ${
                      range === tab
                        ? "bg-[var(--brass)] text-[var(--on-brass)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {areaLabel(tab, L)}
                  </button>
                ))}
              </div>

              {range !== "overall" ? (
                <div className="mt-3 flex gap-1 border border-[var(--line)] p-0.5 text-xs w-fit">
                  <button
                    type="button"
                    onClick={() => setHorizon("now")}
                    className={`px-3 py-1.5 ${
                      horizon === "now"
                        ? "bg-[var(--brass)]/20 text-[var(--brass-soft)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {L === "hi" ? "अभी" : "Now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHorizon("near")}
                    className={`px-3 py-1.5 ${
                      horizon === "near"
                        ? "bg-[var(--brass)]/20 text-[var(--brass-soft)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {L === "hi" ? "निकट भविष्य" : "Near term"}
                  </button>
                </div>
              ) : null}

              <div className="mt-8 space-y-4">
                {busy && !predText ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    {L === "hi"
                      ? `पढ़ाई तैयार हो रही है… (${stage + 1}/3)`
                      : `Preparing reading… (${stage + 1}/3)`}
                  </p>
                ) : !predText ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--text-muted)]">
                      {predError ||
                        (L === "hi"
                          ? "चार्ट तथ्यों से अंतर्दृष्टि बनाएँ।"
                          : "Generate insights from chart facts.")}
                    </p>
                    <button
                      type="button"
                      onClick={() => void load(L)}
                      className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)]"
                    >
                      {L === "hi" ? "राशिफल बनाएँ" : "Generate horoscope"}
                    </button>
                  </div>
                ) : range === "overall" ? (
                  <article className="space-y-3 border border-[var(--brass)]/25 bg-[var(--brass)]/5 px-4 py-5">
                    <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--text)]">
                      {L === "hi" ? "चित्र" : "Portrait"}
                    </h2>
                    {chart?.asOfDate ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        {L === "hi" ? "तिथि" : "As of"} {chart.asOfDate}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                      {predText.portrait}
                    </p>
                  </article>
                ) : areaRow ? (
                  <article className="space-y-3 border border-[var(--line)] px-4 py-5">
                    <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--text)]">
                      {areaRow.headline || areaLabel(range, L)}
                    </h2>
                    <p className="text-sm text-[var(--text-soft)]">
                      {areaRow.overview}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                      {horizon === "now" ? areaRow.now : areaRow.nearTerm}
                    </p>
                    {areaRow.guidance ? (
                      <p className="text-sm text-[var(--brass-soft)]">
                        {areaRow.guidance}
                      </p>
                    ) : null}
                  </article>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    {L === "hi"
                      ? "इस क्षेत्र के लिए अभी पाठ उपलब्ध नहीं।"
                      : "No reading for this area yet."}
                  </p>
                )}
              </div>

              <p className="mt-8 text-xs text-[var(--text-muted)]">
                {L === "hi"
                  ? "एफेमेरिस सत्य का स्रोत है। LLM केवल तथ्यों का वर्णन करता है।"
                  : "Ephemeris is the source of truth. LLM copy only narrates fact packs."}
              </p>
              <Link
                href={
                  source?.kind === "member"
                    ? `/astrology/members/${source.id}`
                    : "/astrology"
                }
                className="mt-4 inline-block text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
              >
                {L === "hi" ? "पूर्ण चार्ट खोलें" : "Open full chart"}
              </Link>
            </>
          )}
        </>
      )}
    </main>
  );
}
