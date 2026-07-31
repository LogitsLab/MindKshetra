"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AstroChat, { type AstroChatMessage } from "@/components/astrology/AstroChat";
import DashaTimeline from "@/components/astrology/DashaTimeline";
import NorthIndianChart from "@/components/astrology/NorthIndianChart";
import PlanetDetailSheet from "@/components/astrology/PlanetDetailSheet";
import PressurePracticeCard from "@/components/astrology/PressurePracticeCard";
import SouthIndianChart from "@/components/astrology/SouthIndianChart";
import { useLanguage } from "@/components/LanguageProvider";
import {
  PLANET_LABELS,
  SIGN_LABELS,
  longitudeToNakshatra,
} from "@/lib/astrology/signs";
import type {
  AreaPrediction,
  BlendedVerdict,
  ChartPayload,
  DashaPeriod,
  LifeArea,
} from "@/lib/astrology/types";

type Tab =
  | "overview"
  | "chart"
  | "dasha"
  | "timing"
  | "navamsa"
  | "yogas"
  | "remedies"
  | "predictions"
  | "chat";

type ChartStyle = "north" | "south";
type VargaKind = "d9" | "d10";
type PredDetail = "simple" | "detailed";

type Props = {
  chart: ChartPayload;
  title: string;
  subtitle?: string;
  incognito?: boolean;
  memberId?: string;
  /** Incognito chart session id (see lib/astrology/incognito.ts). */
  chartSessionId?: string;
  onRequestPredictions?: (force?: boolean) => Promise<ChartPayload>;
  onAsOfDateChange?: (asOfDate: string) => Promise<ChartPayload>;
  onEditBirth?: () => void;
  onSaveAsMember?: () => Promise<void>;
  saveBusy?: boolean;
  showGuidedPath?: boolean;
};

const AREA_KEYS: LifeArea[] = [
  "career",
  "marriage",
  "health",
  "finance",
  "education",
  "travel",
];

const CONF_RANK: Record<BlendedVerdict["confidence"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

type GlossTab = "dasha" | "timing" | "navamsa" | "remedies";

const GLOSS_TABS: GlossTab[] = ["dasha", "timing", "navamsa", "remedies"];

const GLOSS_KEYS = {
  dasha: "astroGlossDasha",
  timing: "astroGlossTiming",
  navamsa: "astroGlossNavamsa",
  remedies: "astroGlossRemedies",
} as const;

function topBlended(blended: BlendedVerdict[]): BlendedVerdict | undefined {
  return [...blended].sort(
    (a, b) => CONF_RANK[b.confidence] - CONF_RANK[a.confidence]
  )[0];
}

function areaCitations(blended?: BlendedVerdict): string[] {
  if (!blended) return [];
  const preferred = [
    ...blended.strengths.slice(0, 1),
    blended.timing,
    ...blended.tensions.slice(0, 1),
  ].filter(Boolean) as string[];
  if (preferred.length) return preferred.slice(0, 2);
  return blended.narrativeBullets.slice(0, 2);
}

function resolvePlanet(
  chart: ChartPayload,
  id: string
): ChartPayload["planets"][number] | ChartPayload["ascendant"] | null {
  if (id === "ascendant") return chart.ascendant;
  return chart.planets.find((p) => p.id === id) ?? null;
}

export default function ChartHub({
  chart: initial,
  title,
  subtitle,
  incognito,
  memberId,
  chartSessionId,
  onRequestPredictions,
  onAsOfDateChange,
  onEditBirth,
  onSaveAsMember,
  saveBusy,
  showGuidedPath = true,
}: Props) {
  const { t, lang } = useLanguage();
  const storageId = chartSessionId || memberId || "anon";

  const [tab, setTab] = useState<Tab>("overview");
  const [chart, setChart] = useState(initial);
  const [predBusy, setPredBusy] = useState(false);
  const [predError, setPredError] = useState<string | null>(null);
  const [asOfBusy, setAsOfBusy] = useState(false);
  const [showCusps, setShowCusps] = useState(false);
  const [showVerdictDrawer, setShowVerdictDrawer] = useState(false);
  const [yogasPresentOnly, setYogasPresentOnly] = useState(true);
  const [openMahas, setOpenMahas] = useState<Record<string, boolean>>({});
  const [guidedDismissed, setGuidedDismissed] = useState(true);
  const [glossDismissed, setGlossDismissed] = useState<Record<string, boolean>>(
    {}
  );
  const [chartStyle, setChartStyle] = useState<ChartStyle>("north");
  const [showBirthDetails, setShowBirthDetails] = useState(false);
  const [focusArea, setFocusArea] = useState<LifeArea | null>(null);
  const [predDetail, setPredDetail] = useState<PredDetail>("detailed");
  const [vargaKind, setVargaKind] = useState<VargaKind>("d9");
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AstroChatMessage[]>([]);

  useEffect(() => {
    setChart(initial);
  }, [initial]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGuidedDismissed(
      sessionStorage.getItem(`mk-astro-guided:${storageId}`) === "1"
    );
    const dismissed: Record<string, boolean> = {};
    for (const glossTab of GLOSS_TABS) {
      if (
        sessionStorage.getItem(`mk-astro-gloss:${storageId}:${glossTab}`) ===
        "1"
      ) {
        dismissed[glossTab] = true;
      }
    }
    setGlossDismissed(dismissed);
  }, [storageId]);

  const dismissGuided = useCallback(() => {
    setGuidedDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`mk-astro-guided:${storageId}`, "1");
    }
  }, [storageId]);

  const dismissGloss = useCallback(
    (glossTab: Tab) => {
      setGlossDismissed((s) => ({ ...s, [glossTab]: true }));
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`mk-astro-gloss:${storageId}:${glossTab}`, "1");
      }
    },
    [storageId]
  );

  const primaryTabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t("astroTabOverview") },
    { id: "chart", label: t("astroTabChart") },
    { id: "dasha", label: t("astroTabDasha") },
    { id: "predictions", label: t("astroTabPredictions") },
    { id: "chat", label: t("astroTabChat") },
  ];

  const advancedTabs: { id: Tab; label: string }[] = [
    { id: "timing", label: t("astroTabTiming") },
    { id: "navamsa", label: t("astroTabNavamsa") },
    { id: "yogas", label: t("astroTabYogas") },
    { id: "remedies", label: t("astroTabRemedies") },
  ];

  async function loadPredictions(force = false) {
    if (!onRequestPredictions) return;
    setPredBusy(true);
    setPredError(null);
    try {
      const next = await onRequestPredictions(force);
      setChart(next);
    } catch (err) {
      setPredError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPredBusy(false);
    }
  }

  useEffect(() => {
    if (tab !== "predictions") return;
    if (chart.predictionsText?.portrait) return;
    if (predBusy || !onRequestPredictions) return;
    void loadPredictions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, chart.predictionsText?.portrait, onRequestPredictions]);

  async function handleAsOfChange(nextDate: string) {
    if (!onAsOfDateChange || nextDate === chart.asOfDate) return;
    setAsOfBusy(true);
    try {
      const next = await onAsOfDateChange(nextDate);
      setChart(next);
    } catch {
      /* parent may surface errors */
    } finally {
      setAsOfBusy(false);
    }
  }

  function goToPredictions(area?: LifeArea) {
    if (area) setFocusArea(area);
    setTab("predictions");
  }

  const labelSign = (s: string | null | undefined) => {
    if (!s) return "—";
    const row = SIGN_LABELS[s as keyof typeof SIGN_LABELS];
    return row ? (lang === "hi" ? row.hi : row.en) : s;
  };

  const labelPlanet = (id: string) => {
    const row = PLANET_LABELS[id as keyof typeof PLANET_LABELS];
    return row ? (lang === "hi" ? row.hi : row.en) : id;
  };

  const moon = chart.planets.find((p) => p.id === "moon");
  const presentYogas = chart.yogas.filter((y) => y.present);
  const yogasToShow = yogasPresentOnly ? presentYogas : chart.yogas;
  const dignityOf = (id: string) =>
    chart.dignities?.find((d) => d.planet === id);
  const aspects = chart.aspects ?? [];
  const transitEmphasis = chart.transits?.emphasis ?? [];

  const glanceVerdict = useMemo(
    () => topBlended(chart.verdicts.blended),
    [chart.verdicts.blended]
  );

  const featuredArea = useMemo(() => {
    if (focusArea) return focusArea;
    return topBlended(chart.verdicts.blended)?.lifeArea ?? "career";
  }, [focusArea, chart.verdicts.blended]);

  const otherAreas = useMemo(
    () => AREA_KEYS.filter((a) => a !== featuredArea),
    [featuredArea]
  );

  const blendedByArea = useMemo(() => {
    const map = new Map<LifeArea, BlendedVerdict>();
    for (const b of chart.verdicts.blended) map.set(b.lifeArea, b);
    return map;
  }, [chart.verdicts.blended]);

  const chatStarters = useMemo(() => {
    const maha = chart.overview.currentMaha?.lord;
    const top = topBlended(chart.verdicts.blended);
    if (lang === "hi") {
      return [
        maha
          ? `${chart.asOfDate} को ${maha} महादशा मेरे लिए क्या खोल रही है?`
          : `${chart.asOfDate} को मेरी वर्तमान दशा क्या कहती है?`,
        top
          ? `${t(`astroArea_${top.lifeArea}` as "astroArea_career")} इस कुंडली में कैसे दिखता है?`
          : "करियर इस कुंडली में कैसे दिखता है?",
        presentYogas[0]
          ? `${presentYogas[0].name} का यहाँ क्या अर्थ है?`
          : "इस कुंडली में रिश्ते भाव कैसे पढ़ें?",
      ].slice(0, 3);
    }
    return [
      maha
        ? `As of ${chart.asOfDate}, what is my ${maha} mahadasha asking of me?`
        : `As of ${chart.asOfDate}, what does my current dasha emphasize?`,
      top
        ? `How does ${top.lifeArea} read in this chart, with citations?`
        : "How does career read in this chart, with citations?",
      presentYogas[0]
        ? `What does ${presentYogas[0].name} mean in this chart specifically?`
        : "How should I read relationships from this chart?",
    ].slice(0, 3);
  }, [
    chart.asOfDate,
    chart.overview.currentMaha?.lord,
    chart.verdicts.blended,
    lang,
    presentYogas,
    t,
  ]);

  function periodKey(p: DashaPeriod) {
    return `${p.lord}-${p.start}`;
  }

  function isActive(p: DashaPeriod) {
    return chart.asOfDate >= p.start && chart.asOfDate < p.end;
  }

  const chartCommonProps = {
    chart,
    emptyLabel: t("astroChartEmptyTob"),
    onPlanetClick: (id: string) => setSelectedPlanetId(id),
  };

  const activeVarga =
    vargaKind === "d9" ? chart.vargas?.d9 : chart.vargas?.d10;

  const selectedPlanet = selectedPlanetId
    ? resolvePlanet(chart, selectedPlanetId)
    : null;
  const selectedDignity = selectedPlanetId
    ? dignityOf(selectedPlanetId)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade lg:max-w-none">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brass)]">
              {t("astroEyebrow")}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--text)] sm:text-5xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-[var(--text-muted)] sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {onAsOfDateChange ? (
                <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="text-[var(--brass-soft)]">
                    {t("astroAsOfPicker")}
                  </span>
                  <input
                    type="date"
                    value={chart.asOfDate}
                    disabled={asOfBusy}
                    onChange={(e) => handleAsOfChange(e.target.value)}
                    className="border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--text)] outline-none focus:border-[var(--brass)]/45 disabled:opacity-50"
                  />
                </label>
              ) : (
                <p className="text-xs tracking-wide text-[var(--brass-soft)]">
                  {t("astroAsOf")} {chart.asOfDate}
                </p>
              )}
              {onEditBirth ? (
                <button
                  type="button"
                  onClick={onEditBirth}
                  className="border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
                >
                  {t("astroEditBirth")}
                </button>
              ) : null}
            </div>
            {onSaveAsMember ? (
              <button
                type="button"
                onClick={() => onSaveAsMember()}
                disabled={saveBusy}
                className="bg-[var(--brass)] px-3.5 py-2 text-xs font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
              >
                {saveBusy ? t("astroWorking") : t("astroSaveGuestMember")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
          {chart.ephemerisMode === "swiss" ? (
            <span>{t("astroEpheSwiss")}</span>
          ) : chart.ephemerisMode ? (
            <span>{t("astroEpheMoshier")}</span>
          ) : null}
          {incognito ? (
            <span className="text-[var(--brass-soft)]">
              {t("astroIncognitoShort")}
            </span>
          ) : null}
        </div>

        {chart.tobUnknown ? (
          <p className="border-l-2 border-[var(--brass)]/50 pl-3 text-sm text-[var(--text-muted)]">
            {t("astroTobBanner")}
          </p>
        ) : null}
      </header>

      {showGuidedPath && !guidedDismissed && tab === "overview" ? (
        <div className="relative overflow-hidden py-6">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--brass)]/[0.12] via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative border-y border-[var(--brass)]/30 py-5">
            <p className="font-display text-xl text-[var(--text)]">
              {t("astroGuidedTitle")}
            </p>
            <p className="mt-1.5 max-w-lg text-sm text-[var(--text-muted)]">
              {t("astroGuidedBlurb")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTab("chart")}
                className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("astroGuidedChart")}
              </button>
              <button
                type="button"
                onClick={() => setTab("dasha")}
                className="border border-white/20 px-4 py-2.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/50"
              >
                {t("astroGuidedDasha")}
              </button>
              <button
                type="button"
                onClick={() => setTab("predictions")}
                className="border border-white/20 px-4 py-2.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/50"
              >
                {t("astroGuidedReading")}
              </button>
              <button
                type="button"
                onClick={dismissGuided}
                className="px-3 py-2.5 text-xs text-[var(--text-muted)] underline-offset-2 hover:underline"
              >
                {t("astroGuidedDismiss")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-6 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12 lg:space-y-0">
        <nav aria-label={t("astroEyebrow")}>
          {/* Below lg: every section in one scrollable row — no overflow menu. */}
          <div className="sticky top-14 z-20 -mx-1 bg-[var(--nav-bg)]/95 px-1 backdrop-blur-md lg:hidden">
            <div className="flex gap-0.5 overflow-x-auto border-b border-[var(--hairline)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[...primaryTabs, ...advancedTabs].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`shrink-0 px-2.5 py-3 text-[13px] transition sm:px-3.5 sm:py-3.5 sm:text-sm ${
                    tab === item.id
                      ? "border-b-2 border-[var(--brass)] text-[var(--brass-soft)]"
                      : "border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* lg+: a quiet left rail; the sidebar has room for every section. */}
          <div className="hidden lg:sticky lg:top-24 lg:block lg:space-y-0.5">
            {primaryTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`block w-full border-l-2 px-3.5 py-2.5 text-left text-sm transition ${
                  tab === item.id
                    ? "border-[var(--brass)] bg-[var(--brass)]/[0.07] text-[var(--brass-soft)]"
                    : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--brass)]/40 hover:text-[var(--text)]"
                }`}
              >
                {item.label}
              </button>
            ))}
            <p className="px-3.5 pb-1.5 pt-5 text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t("astroTabMore")}
            </p>
            {advancedTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`block w-full border-l-2 px-3.5 py-2.5 text-left text-sm transition ${
                  tab === item.id
                    ? "border-[var(--brass)] bg-[var(--brass)]/[0.07] text-[var(--brass-soft)]"
                    : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--brass)]/40 hover:text-[var(--text)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-8">

      {GLOSS_TABS.includes(tab as GlossTab) && !glossDismissed[tab] ? (
        <GlossaryBanner
          text={t(GLOSS_KEYS[tab as GlossTab])}
          dismissLabel={t("astroGlossDismiss")}
          onDismiss={() => dismissGloss(tab)}
        />
      ) : null}

      {tab === "overview" ? (
        <section className="animate-fade space-y-10">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-3">
              <ChartStyleToggle
                chartStyle={chartStyle}
                onChange={setChartStyle}
                northLabel={t("astroChartStyleNorth")}
                southLabel={t("astroChartStyleSouth")}
              />
              <button
                type="button"
                onClick={() => setTab("chart")}
                className="group max-w-sm text-left transition"
              >
                {chartStyle === "north" ? (
                  <NorthIndianChart
                    {...chartCommonProps}
                    className="transition group-hover:opacity-90"
                    legend={t("astroOpenChart")}
                    showAbbrLegend
                  />
                ) : (
                  <SouthIndianChart
                    {...chartCommonProps}
                    className="transition group-hover:opacity-90"
                    legend={t("astroOpenChart")}
                  />
                )}
              </button>
              <p className="text-xs text-[var(--text-muted)]">
                {t("astroPlanetLegend")}
              </p>
            </div>

            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <Stat
                  label={t("astroAsc")}
                  value={labelSign(chart.overview.ascendantSign)}
                  detail={
                    chart.ascendant
                      ? `${chart.ascendant.nakshatra} · ${chart.ascendant.pada}`
                      : undefined
                  }
                />
                <Stat
                  label={t("astroMoon")}
                  value={labelSign(chart.overview.moonSign)}
                  detail={
                    moon ? `${moon.nakshatra} · ${moon.pada}` : undefined
                  }
                />
                <Stat
                  label={t("astroSun")}
                  value={labelSign(chart.overview.sunSign)}
                />
                <div className="border-l-2 border-[var(--brass)] pl-4 py-0.5">
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {t("astroCurrentDasha")}
                  </p>
                  <p className="mt-1.5 font-display text-2xl tracking-tight text-[var(--text)]">
                    {chart.overview.currentMaha
                      ? labelPlanet(chart.overview.currentMaha.lord)
                      : "—"}
                    {chart.overview.currentAntar
                      ? ` / ${labelPlanet(chart.overview.currentAntar.lord)}`
                      : ""}
                  </p>
                  {chart.overview.currentMaha ? (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {chart.overview.currentMaha.start} →{" "}
                      {chart.overview.currentMaha.end}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-muted)]">
                <p>
                  {chart.birth.dob}
                  {chart.tobUnknown
                    ? ` · ${t("astroTobUnknown")}`
                    : chart.birth.tob
                      ? ` · ${chart.birth.tob}`
                      : ""}
                </p>
                <p>{chart.birth.placeLabel}</p>
              </div>
            </div>
          </div>

          {glanceVerdict ? (
            <div className="border border-[var(--brass)]/25 bg-[var(--brass)]/5 px-4 py-4">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--brass-soft)]">
                {t("astroAtAGlance")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
                {glanceVerdict.theme}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {glanceVerdict.timing}
              </p>
            </div>
          ) : null}

          {memberId ? <PressurePracticeCard memberId={memberId} /> : null}

          <div>
            <button
              type="button"
              onClick={() => setShowBirthDetails((v) => !v)}
              className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              {showBirthDetails
                ? t("astroHideBirthDetails")
                : t("astroBirthDetails")}
            </button>
            {showBirthDetails ? (
              <div className="mt-4 space-y-6">
                {chart.panchang ? (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[var(--hairline)] py-4 text-xs text-[var(--text-muted)]">
                    <span>
                      <span className="text-[var(--brass-soft)]">
                        {t("astroTithi")}
                      </span>{" "}
                      {chart.panchang.tithi}
                    </span>
                    <span>
                      <span className="text-[var(--brass-soft)]">
                        {t("astroNakshatra")}
                      </span>{" "}
                      {chart.panchang.nakshatra}
                    </span>
                    <span>
                      <span className="text-[var(--brass-soft)]">
                        {t("astroYoga")}
                      </span>{" "}
                      {chart.panchang.yoga}
                    </span>
                    <span>
                      <span className="text-[var(--brass-soft)]">
                        {t("astroKarana")}
                      </span>{" "}
                      {chart.panchang.karana}
                    </span>
                    <span>
                      <span className="text-[var(--brass-soft)]">
                        {t("astroVaar")}
                      </span>{" "}
                      {chart.panchang.vaar}
                    </span>
                  </div>
                ) : null}

                {chart.transits && chart.transits.hits.length > 0 ? (
                  <div className="text-sm">
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {t("astroTransitHits")} · {chart.asOfDate}
                    </p>
                    <ul className="mt-2 space-y-1 text-[var(--text-muted)]">
                      {chart.transits.hits.slice(0, 5).map((h) => (
                        <li key={`${h.transitPlanet}-${h.natalPlanet}-${h.orb}`}>
                          {labelPlanet(h.transitPlanet)} →{" "}
                          {labelPlanet(h.natalPlanet)} ({h.orb}°)
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {transitEmphasis.length > 0 ? (
                  <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                    {transitEmphasis.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}

                {presentYogas.length > 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    <span className="text-[var(--brass-soft)]">
                      {t("astroPresentYogas")}:{" "}
                    </span>
                    {presentYogas.map((y) => y.name).join(" · ")}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {chart.verdicts.blended.map((b) => (
                    <span
                      key={b.lifeArea}
                      className="border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
                    >
                      {t(`astroArea_${b.lifeArea}` as "astroArea_career")} ·{" "}
                      {t(`astroConf_${b.confidence}` as "astroConf_high")}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {chart.verdicts.blended.map((b) => (
              <button
                key={b.lifeArea}
                type="button"
                onClick={() => goToPredictions(b.lifeArea)}
                className="border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
              >
                {t(`astroArea_${b.lifeArea}` as "astroArea_career")} ·{" "}
                {t(`astroConf_${b.confidence}` as "astroConf_high")}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "chart" ? (
        <section className="space-y-6">
          <ChartStyleToggle
            chartStyle={chartStyle}
            onChange={setChartStyle}
            northLabel={t("astroChartStyleNorth")}
            southLabel={t("astroChartStyleSouth")}
          />
          {chartStyle === "north" ? (
            <NorthIndianChart
              {...chartCommonProps}
              legend={t("astroChartLegend")}
              showAbbrLegend
            />
          ) : (
            <SouthIndianChart
              {...chartCommonProps}
              legend={t("astroChartLegend")}
            />
          )}
          <p className="text-xs text-[var(--text-muted)]">
            {t("astroPlanetLegend")}
          </p>

          <PlanetTable
            chart={chart}
            labelSign={labelSign}
            labelPlanet={labelPlanet}
            dignityOf={dignityOf}
            lang={lang}
            t={t}
          />

          {aspects.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text)]">
                {t("astroAspects")}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[24rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                      <th className="py-2 pr-3 font-medium">{t("astroPlanet")}</th>
                      <th className="py-2 pr-3 font-medium">→</th>
                      <th className="py-2 pr-3 font-medium">{t("astroPlanet")}</th>
                      <th className="py-2 font-medium">{t("astroHouse")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aspects.map((a, i) => (
                      <tr
                        key={`${a.from}-${a.to}-${i}`}
                        className="border-b border-[var(--hairline)] text-[var(--text)]"
                      >
                        <td className="py-2 pr-3">{labelPlanet(a.from)}</td>
                        <td className="py-2 pr-3 text-[var(--text-muted)]">→</td>
                        <td className="py-2 pr-3">{labelPlanet(a.to)}</td>
                        <td className="py-2">{a.housesApart}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {chart.placidusCusps && !chart.tobUnknown ? (
            <div>
              <button
                type="button"
                onClick={() => setShowCusps((v) => !v)}
                className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
              >
                {showCusps ? t("astroHideCusps") : t("astroShowCusps")}
              </button>
              {showCusps ? (
                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                      <th className="py-2 pr-3">{t("astroHouse")}</th>
                      <th className="py-2 pr-3">{t("astroSign")}</th>
                      <th className="py-2">{t("astroLon")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.placidusCusps.map((c) => (
                      <tr
                        key={c.house}
                        className="border-b border-[var(--hairline)] text-[var(--text)]"
                      >
                        <td className="py-2 pr-3">{c.house}</td>
                        <td className="py-2 pr-3">{labelSign(c.sign)}</td>
                        <td className="py-2">{c.longitude.toFixed(2)}°</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "dasha" ? (
        <section className="space-y-4">
          <DashaTimeline
            maha={chart.overview.currentMaha}
            asOfDate={chart.asOfDate}
            labelPlanet={labelPlanet}
            title={t("astroDashaTimeline")}
            asOfLabel={t("astroAsOf")}
          />

          <div className="border border-[var(--brass)]/30 bg-[var(--brass)]/5 px-4 py-3 text-sm">
            <p className="font-medium text-[var(--text)]">
              {t("astroCurrentPath")}
            </p>
            <p className="mt-1 text-[var(--text-muted)]">
              {chart.overview.currentMaha
                ? `${labelPlanet(chart.overview.currentMaha.lord)} (${chart.overview.currentMaha.start} → ${chart.overview.currentMaha.end})`
                : "—"}
              {chart.overview.currentAntar
                ? ` → ${labelPlanet(chart.overview.currentAntar.lord)} (${chart.overview.currentAntar.start} → ${chart.overview.currentAntar.end})`
                : ""}
              {chart.overview.currentPratyantar
                ? ` → ${labelPlanet(chart.overview.currentPratyantar.lord)} (${chart.overview.currentPratyantar.start} → ${chart.overview.currentPratyantar.end})`
                : ""}
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {t("astroDashaBalance")}:{" "}
              {Math.round(chart.dasha.balanceAtBirthDays)} {t("astroDays")} ·{" "}
              {t("astroAsOf")} {chart.asOfDate}
            </p>
          </div>

          {chart.dasha.tree.map((maha) => {
            const key = periodKey(maha);
            const open = openMahas[key] ?? isActive(maha);
            return (
              <div
                key={key}
                className={`border border-[var(--line)] ${
                  isActive(maha)
                    ? "border-[var(--brass)]/50 bg-[var(--brass)]/5"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-2 px-4 py-3 text-left"
                  onClick={() =>
                    setOpenMahas((s) => ({ ...s, [key]: !open }))
                  }
                >
                  <p className="font-medium text-[var(--text)]">
                    {labelPlanet(maha.lord)}
                    {isActive(maha) ? (
                      <span className="ml-2 text-xs text-[var(--brass-soft)]">
                        {t("astroNow")}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {maha.start} → {maha.end}
                  </p>
                </button>
                {open ? (
                  <ul className="space-y-2 border-t border-[var(--hairline)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    {(maha.children || []).map((a) => (
                      <li key={periodKey(a)}>
                        <span
                          className={
                            isActive(a) ? "text-[var(--brass-soft)]" : ""
                          }
                        >
                          {labelPlanet(a.lord)} · {a.start} → {a.end}
                        </span>
                        {isActive(a) && a.children?.length ? (
                          <ul className="mt-1 space-y-0.5 pl-4 text-xs">
                            {a.children.map((p) => (
                              <li
                                key={periodKey(p)}
                                className={
                                  isActive(p)
                                    ? "text-[var(--brass-soft)]"
                                    : ""
                                }
                              >
                                {labelPlanet(p.lord)} · {p.start} → {p.end}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {tab === "timing" ? (
        <section className="space-y-6">
          <p className="text-sm text-[var(--text-muted)]">{t("astroTimingBlurb")}</p>
          {!chart.kp || chart.tobUnknown ? (
            <p className="text-sm text-[var(--text-muted)]">{t("astroTimingNeedTob")}</p>
          ) : (
            <>
              {chart.ayanamsaKp != null ? (
                <p className="text-xs text-[var(--text-muted)]">
                  {t("astroKpAyanamsa")}: {chart.ayanamsaKp.toFixed(4)}°
                </p>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                      <th className="py-2 pr-3">{t("astroHouse")}</th>
                      <th className="py-2 pr-3">{t("astroLon")}</th>
                      <th className="py-2 pr-3">{t("astroStarLord")}</th>
                      <th className="py-2 pr-3">{t("astroSubLord")}</th>
                      <th className="py-2">{t("astroSubSubLord")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.kp.cusps.map((c) => (
                      <tr
                        key={c.house}
                        className="border-b border-[var(--hairline)] text-[var(--text)]"
                      >
                        <td className="py-2 pr-3">{c.house}</td>
                        <td className="py-2 pr-3">{c.longitude.toFixed(2)}°</td>
                        <td className="py-2 pr-3">{labelPlanet(c.starLord)}</td>
                        <td className="py-2 pr-3">{labelPlanet(c.subLord)}</td>
                        <td className="py-2">{labelPlanet(c.subSubLord)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text)]">
                  {t("astroPlanetSubs")}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                        <th className="py-2 pr-3">{t("astroPlanet")}</th>
                        <th className="py-2 pr-3">{t("astroHouse")}</th>
                        <th className="py-2 pr-3">{t("astroStarLord")}</th>
                        <th className="py-2 pr-3">{t("astroSubLord")}</th>
                        <th className="py-2">{t("astroSubSubLord")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.kp.planets.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-[var(--hairline)] text-[var(--text)]"
                        >
                          <td className="py-2 pr-3">{labelPlanet(p.id)}</td>
                          <td className="py-2 pr-3">{p.house ?? "—"}</td>
                          <td className="py-2 pr-3">{labelPlanet(p.starLord)}</td>
                          <td className="py-2 pr-3">{labelPlanet(p.subLord)}</td>
                          <td className="py-2">{labelPlanet(p.subSubLord)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {chart.kp.significators?.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--text)]">
                    {t("astroSignificators")}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {chart.kp.significators.map((s) => (
                      <p
                        key={s.house}
                        className="border border-[var(--line)] px-3 py-2 text-xs text-[var(--text-muted)]"
                      >
                        <span className="text-[var(--text)]">
                          {t("astroHouse")} {s.house}:{" "}
                        </span>
                        {s.significators.map(labelPlanet).join(", ") || "—"}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {tab === "navamsa" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVargaKind("d9")}
              className={`px-3 py-1.5 text-sm transition ${
                vargaKind === "d9"
                  ? "bg-[var(--brass)] text-[var(--on-brass)]"
                  : "border border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/40"
              }`}
            >
              {t("astroVargaD9")}
            </button>
            <button
              type="button"
              onClick={() => setVargaKind("d10")}
              className={`px-3 py-1.5 text-sm transition ${
                vargaKind === "d10"
                  ? "bg-[var(--brass)] text-[var(--on-brass)]"
                  : "border border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/40"
              }`}
            >
              {t("astroVargaD10")}
            </button>
          </div>

          {activeVarga ? (
            <>
              {chartStyle === "north" ? (
                <NorthIndianChart
                  chart={chart}
                  override={{
                    ascendant: activeVarga.ascendant,
                    planets: activeVarga.planets,
                  }}
                  legend={
                    vargaKind === "d9"
                      ? t("astroNavamsaLegend")
                      : t("astroVargaD10")
                  }
                  emptyLabel={t("astroChartEmptyTob")}
                  onPlanetClick={(id) => setSelectedPlanetId(id)}
                />
              ) : (
                <SouthIndianChart
                  chart={chart}
                  override={{
                    ascendant: activeVarga.ascendant,
                    planets: activeVarga.planets,
                  }}
                  legend={
                    vargaKind === "d9"
                      ? t("astroNavamsaLegend")
                      : t("astroVargaD10")
                  }
                  emptyLabel={t("astroChartEmptyTob")}
                  onPlanetClick={(id) => setSelectedPlanetId(id)}
                />
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                      <th className="py-2 pr-3">{t("astroPlanet")}</th>
                      <th className="py-2 pr-3">{t("astroSign")}</th>
                      <th className="py-2 pr-3">{t("astroHouse")}</th>
                      <th className="py-2 pr-3">{t("astroNakshatra")}</th>
                      {chart.transits?.planets.some((p) => p.house != null) ? (
                        <th className="py-2">{t("astroTransitHouse")}</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {activeVarga.ascendant ? (
                      <tr className="border-b border-[var(--hairline)] text-[var(--text)]">
                        <td className="py-2 pr-3">{labelPlanet("ascendant")}</td>
                        <td className="py-2 pr-3">
                          {labelSign(activeVarga.ascendant.sign)}
                        </td>
                        <td className="py-2 pr-3">1</td>
                        <td className="py-2 pr-3">
                          {activeVarga.ascendant.nakshatra}
                        </td>
                        {chart.transits?.planets.some((p) => p.house != null) ? (
                          <td className="py-2">—</td>
                        ) : null}
                      </tr>
                    ) : null}
                    {activeVarga.planets.map((p) => {
                      const transit = chart.transits?.planets.find(
                        (tp) => tp.id === p.id
                      );
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-[var(--hairline)] text-[var(--text)]"
                        >
                          <td className="py-2 pr-3">{labelPlanet(p.id)}</td>
                          <td className="py-2 pr-3">{labelSign(p.sign)}</td>
                          <td className="py-2 pr-3">{p.house ?? "—"}</td>
                          <td className="py-2 pr-3">
                            {p.nakshatra} ({p.pada})
                          </td>
                          {chart.transits?.planets.some(
                            (tp) => tp.house != null
                          ) ? (
                            <td className="py-2">{transit?.house ?? "—"}</td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {chart.transits ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--text)]">
                    {t("astroTransitsAsOf")} {chart.asOfDate}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[24rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                          <th className="py-2 pr-3">{t("astroPlanet")}</th>
                          <th className="py-2 pr-3">{t("astroSign")}</th>
                          <th className="py-2 pr-3">{t("astroDegree")}</th>
                          {chart.transits.planets.some((p) => p.house != null) ? (
                            <th className="py-2 pr-3">{t("astroTransitHouse")}</th>
                          ) : null}
                          <th className="py-2">R</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chart.transits.planets.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-[var(--hairline)] text-[var(--text)]"
                          >
                            <td className="py-2 pr-3">{labelPlanet(p.id)}</td>
                            <td className="py-2 pr-3">{labelSign(p.sign)}</td>
                            <td className="py-2 pr-3">
                              {p.degreeInSign.toFixed(1)}°
                            </td>
                            {chart.transits!.planets.some(
                              (tp) => tp.house != null
                            ) ? (
                              <td className="py-2 pr-3">{p.house ?? "—"}</td>
                            ) : null}
                            <td className="py-2">{p.retrograde ? "R" : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {chart.transits.hits.length ? (
                    <ul className="mt-3 space-y-1 text-sm text-[var(--text-muted)]">
                      {chart.transits.hits.map((h) => (
                        <li key={`${h.transitPlanet}-${h.natalPlanet}`}>
                          {t("astroTransitHit")}: {labelPlanet(h.transitPlanet)}{" "}
                          ≈ {labelPlanet(h.natalPlanet)} ({h.orb}°)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {t("astroNoTransitHits")}
                    </p>
                  )}
                  {transitEmphasis.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-[var(--text-muted)]">
                      {transitEmphasis.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          )}
        </section>
      ) : null}

      {tab === "yogas" ? (
        <section className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={yogasPresentOnly}
              onChange={(e) => setYogasPresentOnly(e.target.checked)}
            />
            {t("astroYogasPresentOnly")}
          </label>
          <div className="space-y-3">
            {yogasToShow.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                {t("astroNoPresentYogas")}
              </p>
            ) : (
              yogasToShow.map((y) => (
                <div
                  key={y.id}
                  className="border border-[var(--line)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[var(--text)]">{y.name}</p>
                    <span
                      className={`text-xs uppercase tracking-wide ${
                        y.present
                          ? y.severity === "positive"
                            ? "text-emerald-400"
                            : "text-[var(--brass-soft)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {y.present ? t("astroPresent") : t("astroAbsent")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {y.detail}
                  </p>
                  {y.housesInvolved && y.housesInvolved.length > 0 ? (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {t("astroHouse")}: {y.housesInvolved.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {tab === "remedies" ? (
        <section className="space-y-6">
          <p className="border-l-2 border-amber-500/60 pl-3 text-sm text-[var(--text-muted)]">
            {t("astroRemediesDisclaimer")}
          </p>
          <p className="text-sm text-[var(--text-muted)]">{t("astroLalKitabBlurb")}</p>
          {chart.lalKitab ? (
            <>
              <div className="grid grid-cols-3 gap-1 text-xs sm:grid-cols-4">
                {chart.lalKitab.fixedHouses.map((h) => (
                  <div
                    key={h.house}
                    className="border border-[var(--line)] px-2 py-2"
                  >
                    <p className="text-[var(--brass-soft)]">
                      {h.house} · {labelSign(h.sign)}
                    </p>
                    <p className="mt-1 text-[var(--text-muted)]">
                      {h.occupants.map(labelPlanet).join(" ") || "—"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {chart.lalKitab.debts.map((d, i) => (
                  <article
                    key={`${d.house}-${i}`}
                    className="border border-[var(--line)] px-4 py-3"
                  >
                    <p className="font-medium text-[var(--text)]">
                      {lang === "hi" ? d.title.hi : d.title.en}
                      {d.house > 0 ? ` · ${t("astroHouse")} ${d.house}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {lang === "hi" ? d.note.hi : d.note.en}
                    </p>
                    <p className="mt-2 text-sm text-[var(--brass-soft)]">
                      {t("astroRemedy")}:{" "}
                      {lang === "hi" ? d.remedy.hi : d.remedy.en}
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          )}
        </section>
      ) : null}

      {tab === "predictions" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowVerdictDrawer((v) => !v)}
              className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              {showVerdictDrawer
                ? t("astroHideVerdicts")
                : t("astroShowVerdicts")}
            </button>
            {chart.predictionsText ? (
              <div className="flex gap-1 border border-[var(--line)] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPredDetail("simple")}
                  className={`px-3 py-1.5 transition ${
                    predDetail === "simple"
                      ? "bg-[var(--brass)] text-[var(--on-brass)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {t("astroSimple")}
                </button>
                <button
                  type="button"
                  onClick={() => setPredDetail("detailed")}
                  className={`px-3 py-1.5 transition ${
                    predDetail === "detailed"
                      ? "bg-[var(--brass)] text-[var(--on-brass)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {t("astroDetailed")}
                </button>
              </div>
            ) : null}
          </div>

          {showVerdictDrawer ? (
            <div className="space-y-2">
              {chart.verdicts.blended.map((b) => (
                <div
                  key={b.lifeArea}
                  className="border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-[var(--text)]">
                      {t(`astroArea_${b.lifeArea}` as "astroArea_career")}
                    </span>
                    <span className="text-xs text-[var(--brass-soft)]">
                      {t(`astroConf_${b.confidence}` as "astroConf_high")}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--text-muted)]">{b.timing}</p>
                  {b.strengths.length ? (
                    <ul className="mt-2 list-disc pl-4 text-xs text-[var(--text-muted)]">
                      {b.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                  {b.tensions.length ? (
                    <ul className="mt-1 list-disc pl-4 text-xs text-[var(--text-muted)]">
                      {b.tensions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {!chart.predictionsText ? (
            <div className="space-y-3">
              <p className="text-[var(--text-muted)]">{t("astroPredBlurb")}</p>
              {predBusy ? (
                <p className="text-sm text-[var(--brass-soft)]">{t("astroWorking")}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => loadPredictions(false)}
                  disabled={!onRequestPredictions}
                  className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)] disabled:opacity-50"
                >
                  {t("astroGeneratePred")}
                </button>
              )}
              {predError ? (
                <p className="text-sm text-red-400">{predError}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-10">
              {chart.predictionsText.source === "rules" ? (
                <p className="border border-[var(--brass)]/30 bg-[var(--brass)]/5 px-3 py-2 text-sm text-[var(--brass-soft)]">
                  {t("astroPredRulesBanner")}
                </p>
              ) : null}
              <article className="space-y-3 border border-[var(--brass)]/25 bg-[var(--brass)]/5 px-4 py-5">
                <h2 className="font-display text-2xl text-[var(--text)]">
                  {t("astroPortrait")}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {t("astroAsOf")} {chart.asOfDate}
                  {chart.predictionsText.generatedAt
                    ? ` · ${t("astroGenerated")} ${new Date(
                        chart.predictionsText.generatedAt
                      ).toLocaleString()}`
                    : ""}
                  {` · ${chart.predictionsText.language.toUpperCase()}`}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                  {chart.predictionsText.portrait}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => loadPredictions(true)}
                    disabled={predBusy}
                    className="text-xs text-[var(--brass-soft)] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {predBusy ? t("astroWorking") : t("astroRegeneratePred")}
                  </button>
                  <span className="text-[0.7rem] text-[var(--text-muted)]">
                    {t("astroPredRegenerateHint")}
                  </span>
                </div>
              </article>

              <AreaPredictionBlock
                area={featuredArea}
                row={chart.predictionsText.areas[featuredArea]}
                blended={blendedByArea.get(featuredArea)}
                predDetail={predDetail}
                featured
                t={t}
              />

              <details className="group border border-[var(--line)]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--brass)]/5">
                  {t("astroOtherAreas")}
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    ({otherAreas.length})
                  </span>
                </summary>
                <div className="space-y-8 border-t border-[var(--hairline)] px-4 py-6">
                  {otherAreas.map((area) => (
                    <AreaPredictionBlock
                      key={area}
                      area={area}
                      row={chart.predictionsText!.areas[area]}
                      blended={blendedByArea.get(area)}
                      predDetail={predDetail}
                      t={t}
                    />
                  ))}
                </div>
              </details>
            </div>
          )}
        </section>
      ) : null}

      {tab === "chat" ? (
        <section className="min-h-[70vh]">
          <AstroChat
            memberId={memberId}
            chartSessionId={chartSessionId}
            birth={chart.birth as unknown as Record<string, unknown>}
            starters={chatStarters}
            messages={chatMessages}
            onMessagesChange={setChatMessages}
            className="min-h-[70vh]"
            contextLine={`${labelSign(chart.overview.ascendantSign)} Asc · ${labelSign(chart.overview.moonSign)} Moon · ${
              chart.overview.currentMaha
                ? labelPlanet(chart.overview.currentMaha.lord)
                : "—"
            }${
              chart.overview.currentAntar
                ? `/${labelPlanet(chart.overview.currentAntar.lord)}`
                : ""
            } · ${t("astroAsOf")} ${chart.asOfDate}`}
          />
        </section>
      ) : null}
        </div>
      </div>

      <PlanetDetailSheet
        open={selectedPlanetId !== null}
        onClose={() => setSelectedPlanetId(null)}
        planet={selectedPlanet}
        dignityLabel={
          selectedDignity && selectedDignity.kind !== "neutral"
            ? lang === "hi"
              ? selectedDignity.label.hi
              : selectedDignity.label.en
            : undefined
        }
        labelPlanet={labelPlanet}
        labelSign={labelSign}
      />
    </div>
  );
}

function GlossaryBanner({
  text,
  dismissLabel,
  onDismiss,
}: {
  text: string;
  dismissLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border border-[var(--brass)]/30 bg-[var(--brass)]/5 px-4 py-3 text-sm">
      <p className="text-[var(--text-muted)]">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs text-[var(--brass-soft)] underline-offset-2 hover:underline"
      >
        {dismissLabel}
      </button>
    </div>
  );
}

function ChartStyleToggle({
  chartStyle,
  onChange,
  northLabel,
  southLabel,
}: {
  chartStyle: ChartStyle;
  onChange: (s: ChartStyle) => void;
  northLabel: string;
  southLabel: string;
}) {
  return (
    <div className="flex gap-1 border border-[var(--line)] p-0.5 text-xs w-fit">
      <button
        type="button"
        onClick={() => onChange("north")}
        className={`px-3 py-1.5 transition ${
          chartStyle === "north"
            ? "bg-[var(--brass)] text-[var(--on-brass)]"
            : "text-[var(--text-muted)] hover:text-[var(--text)]"
        }`}
      >
        {northLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("south")}
        className={`px-3 py-1.5 transition ${
          chartStyle === "south"
            ? "bg-[var(--brass)] text-[var(--on-brass)]"
            : "text-[var(--text-muted)] hover:text-[var(--text)]"
        }`}
      >
        {southLabel}
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border-l border-[var(--brass)]/35 pl-4 py-1">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl tracking-tight text-[var(--text)]">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
      ) : null}
    </div>
  );
}

function PlanetTable({
  chart,
  labelSign,
  labelPlanet,
  dignityOf,
  lang,
  t,
}: {
  chart: ChartPayload;
  labelSign: (s: string) => string;
  labelPlanet: (id: string) => string;
  dignityOf: (id: string) => ChartPayload["dignities"][number] | undefined;
  lang: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const rows: Array<{
    label: string;
    p: ChartPayload["planets"][number] | NonNullable<ChartPayload["ascendant"]>;
    dignity?: string;
  }> = [];

  if (chart.ascendant) {
    rows.push({ label: labelPlanet("ascendant"), p: chart.ascendant });
  }
  for (const p of chart.planets) {
    const dig = dignityOf(p.id);
    rows.push({
      label: labelPlanet(p.id),
      p,
      dignity:
        dig && dig.kind !== "neutral"
          ? lang === "hi"
            ? dig.label.hi
            : dig.label.en
          : undefined,
    });
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
              <th className="py-2 pr-3 font-medium">{t("astroPlanet")}</th>
              <th className="py-2 pr-3 font-medium">{t("astroSign")}</th>
              <th className="py-2 pr-3 font-medium">{t("astroDegree")}</th>
              <th className="py-2 pr-3 font-medium">{t("astroLon")}</th>
              <th className="py-2 pr-3 font-medium">{t("astroNakshatra")}</th>
              <th className="py-2 pr-3 font-medium">{t("astroNakLord")}</th>
              <th className="py-2 pr-3 font-medium">{t("astroHouse")}</th>
              <th className="py-2 pr-3 font-medium">{t("astroDignity")}</th>
              <th className="py-2 font-medium">R</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, p, dignity }) => (
              <PlanetRow
                key={p.id}
                label={label}
                p={p}
                labelSign={labelSign}
                labelPlanet={labelPlanet}
                dignity={dignity}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map(({ label, p, dignity }) => (
          <PlanetCard
            key={p.id}
            label={label}
            p={p}
            labelSign={labelSign}
            labelPlanet={labelPlanet}
            dignity={dignity}
            t={t}
          />
        ))}
      </div>
    </>
  );
}

function PlanetRow({
  label,
  p,
  labelSign,
  labelPlanet,
  dignity,
}: {
  label: string;
  p: ChartPayload["planets"][number] | NonNullable<ChartPayload["ascendant"]>;
  labelSign: (s: string) => string;
  labelPlanet: (id: string) => string;
  dignity?: string;
}) {
  const nakLord = longitudeToNakshatra(p.longitude).lord;
  return (
    <tr className="border-b border-[var(--hairline)] text-[var(--text)]">
      <td className="py-2 pr-3">{label}</td>
      <td className="py-2 pr-3">{labelSign(p.sign)}</td>
      <td className="py-2 pr-3">{p.degreeInSign.toFixed(1)}°</td>
      <td className="py-2 pr-3">{p.longitude.toFixed(2)}°</td>
      <td className="py-2 pr-3">
        {p.nakshatra} ({p.pada})
      </td>
      <td className="py-2 pr-3">{labelPlanet(nakLord)}</td>
      <td className="py-2 pr-3">{p.house ?? "—"}</td>
      <td className="py-2 pr-3 text-[var(--text-muted)]">{dignity ?? "—"}</td>
      <td className="py-2">{p.retrograde ? "R" : ""}</td>
    </tr>
  );
}

function PlanetCard({
  label,
  p,
  labelSign,
  labelPlanet,
  dignity,
  t,
}: {
  label: string;
  p: ChartPayload["planets"][number] | NonNullable<ChartPayload["ascendant"]>;
  labelSign: (s: string) => string;
  labelPlanet: (id: string) => string;
  dignity?: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const nakLord = longitudeToNakshatra(p.longitude).lord;
  return (
    <div className="border border-[var(--line)] px-3 py-3 text-sm">
      <p className="font-medium text-[var(--text)]">
        {label}
        {p.retrograde ? (
          <span className="ml-1 text-xs text-[var(--text-muted)]">R</span>
        ) : null}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
        <div>
          <dt>{t("astroSign")}</dt>
          <dd className="text-[var(--text)]">{labelSign(p.sign)}</dd>
        </div>
        <div>
          <dt>{t("astroDegree")}</dt>
          <dd className="text-[var(--text)]">{p.degreeInSign.toFixed(1)}°</dd>
        </div>
        <div>
          <dt>{t("astroHouse")}</dt>
          <dd className="text-[var(--text)]">{p.house ?? "—"}</dd>
        </div>
        <div>
          <dt>{t("astroNakshatra")}</dt>
          <dd className="text-[var(--text)]">
            {p.nakshatra} ({p.pada})
          </dd>
        </div>
        <div>
          <dt>{t("astroNakLord")}</dt>
          <dd className="text-[var(--text)]">{labelPlanet(nakLord)}</dd>
        </div>
        <div>
          <dt>{t("astroDignity")}</dt>
          <dd className="text-[var(--text)]">{dignity ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

function AreaPredictionBlock({
  area,
  row,
  blended,
  predDetail,
  featured,
  t,
}: {
  area: LifeArea;
  row: AreaPrediction;
  blended?: BlendedVerdict;
  predDetail: PredDetail;
  featured?: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const citations = areaCitations(blended);
  const overviewSimple =
    predDetail === "simple"
      ? row.overview.split(/\n\n+/).filter(Boolean)[0] || row.overview
      : row.overview;

  return (
    <article className="space-y-5 border-t border-[var(--hairline)] pt-8 first:border-t-0 first:pt-0">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
            {featured
              ? t("astroFeaturedArea")
              : t(`astroArea_${area}` as "astroArea_career")}
          </p>
          {blended ? (
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t(`astroConf_${blended.confidence}` as "astroConf_high")}
              {blended.dashaSupports ? ` · ${t("astroDashaActive")}` : ""}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 font-display text-2xl text-[var(--text)]">
          {row.headline}
        </h3>
      </div>

      {citations.length > 0 ? (
        <div className="border-l-2 border-[var(--brass)]/40 pl-3">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("astroCitations")}
          </p>
          <ul className="mt-1.5 space-y-1.5 text-sm text-[var(--text-muted)]">
            {citations.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t("astroPredWhatChartSays")}
        </h4>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
          {overviewSimple}
        </p>
      </div>

      {predDetail === "detailed" && row.strengths.length ? (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t("astroStrengths")}
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
            {row.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {predDetail === "detailed" && row.watchouts.length ? (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t("astroWatchouts")}
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-muted)]">
            {row.watchouts.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-[var(--brass-soft)]">
          {t("astroNowPeriod")}
        </h4>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
          {row.now}
        </p>
      </div>

      {predDetail === "detailed" ? (
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-[var(--brass-soft)]">
            {t("astroNearTerm")}
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">
            {row.nearTerm}
          </p>
        </div>
      ) : null}

      <div className="space-y-2 border-l-2 border-[var(--brass)]/30 pl-3">
        <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t("astroPredTryThis")}
        </h4>
        <p className="text-sm leading-relaxed text-[var(--text)]">
          {row.guidance}
        </p>
      </div>
    </article>
  );
}
