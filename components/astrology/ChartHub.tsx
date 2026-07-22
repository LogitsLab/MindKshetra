"use client";

import { useEffect, useMemo, useState } from "react";
import AstroChat from "@/components/astrology/AstroChat";
import NorthIndianChart from "@/components/astrology/NorthIndianChart";
import { useLanguage } from "@/components/LanguageProvider";
import {
  PLANET_LABELS,
  SIGN_LABELS,
  longitudeToNakshatra,
} from "@/lib/astrology/signs";
import type {
  ChartPayload,
  DashaPeriod,
  LifeArea,
} from "@/lib/astrology/types";

type Tab =
  | "overview"
  | "chart"
  | "dasha"
  | "yogas"
  | "predictions"
  | "chat";

type Props = {
  chart: ChartPayload;
  title: string;
  subtitle?: string;
  incognito?: boolean;
  memberId?: string;
  sessionId?: string;
  onRequestPredictions?: (force?: boolean) => Promise<ChartPayload>;
};

const AREA_KEYS: LifeArea[] = [
  "career",
  "marriage",
  "health",
  "finance",
  "education",
  "travel",
];

export default function ChartHub({
  chart: initial,
  title,
  subtitle,
  incognito,
  memberId,
  sessionId,
  onRequestPredictions,
}: Props) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<Tab>("overview");
  const [chart, setChart] = useState(initial);
  const [predBusy, setPredBusy] = useState(false);
  const [predError, setPredError] = useState<string | null>(null);
  const [showCusps, setShowCusps] = useState(false);
  const [yogasPresentOnly, setYogasPresentOnly] = useState(true);
  const [openMahas, setOpenMahas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChart(initial);
  }, [initial]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t("astroTabOverview") },
    { id: "chart", label: t("astroTabChart") },
    { id: "dasha", label: t("astroTabDasha") },
    { id: "yogas", label: t("astroTabYogas") },
    { id: "predictions", label: t("astroTabPredictions") },
    { id: "chat", label: t("astroTabChat") },
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

  const chatStarters = useMemo(() => {
    const starters: string[] = [];
    if (lang === "hi") {
      starters.push(
        `आज (${chart.asOfDate}) मेरी दशा क्या कहती है?`,
        "करियर भाव कैसे दिखता है?"
      );
      if (presentYogas[0]) starters.push(`${presentYogas[0].name} का क्या अर्थ है?`);
    } else {
      starters.push(
        `As of ${chart.asOfDate}, what does my current dasha emphasize?`,
        "How does career read in this chart?"
      );
      if (presentYogas[0]) {
        starters.push(`What does ${presentYogas[0].name} mean here?`);
      }
    }
    return starters.slice(0, 3);
  }, [chart.asOfDate, lang, presentYogas]);

  function periodKey(p: DashaPeriod) {
    return `${p.lord}-${p.start}`;
  }

  function isActive(p: DashaPeriod) {
    return (
      chart.asOfDate >= p.start && chart.asOfDate < p.end
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brass-soft)]">
          {t("astroEyebrow")}
        </p>
        <h1 className="font-display text-3xl text-[var(--text)] sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-[var(--text-muted)]">{subtitle}</p>
        ) : null}
        <p className="text-sm text-[var(--brass-soft)]">
          {t("astroAsOf")} {chart.asOfDate}
        </p>
        {incognito ? (
          <p className="border border-[var(--brass)]/30 bg-[var(--brass)]/5 px-3 py-2 text-sm text-[var(--brass-soft)]">
            {t("astroIncognitoBanner")}
          </p>
        ) : null}
        {chart.tobUnknown ? (
          <p className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)]">
            {t("astroTobBanner")}
          </p>
        ) : null}
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-[var(--hairline)] pb-px">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-2.5 text-sm transition ${
              tab === item.id
                ? "border-b-2 border-[var(--brass)] text-[var(--brass-soft)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <section className="space-y-6">
          <div className="grid gap-2 border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
            <p>
              <span className="text-[var(--text)]">{t("astroDob")}: </span>
              {chart.birth.dob}
              {chart.tobUnknown
                ? ` · ${t("astroTobUnknown")}`
                : chart.birth.tob
                  ? ` · ${chart.birth.tob}`
                  : ""}
            </p>
            <p>
              <span className="text-[var(--text)]">{t("astroPlace")}: </span>
              {chart.birth.placeLabel}
            </p>
            <p>
              <span className="text-[var(--text)]">{t("astroTz")}: </span>
              {chart.birth.ianaTz} (UTC
              {chart.birth.utcOffsetMinutes >= 0 ? "+" : ""}
              {(chart.birth.utcOffsetMinutes / 60).toFixed(1)})
            </p>
            <p>
              <span className="text-[var(--text)]">{t("astroAyanamsa")}: </span>
              {chart.ayanamsa.toFixed(4)}° · {t("astroEngine")}{" "}
              {chart.engineVersion}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Stat
              label={t("astroAsc")}
              value={labelSign(chart.overview.ascendantSign)}
              detail={
                chart.ascendant
                  ? `${chart.ascendant.nakshatra} · pada ${chart.ascendant.pada}`
                  : undefined
              }
            />
            <Stat
              label={t("astroMoon")}
              value={labelSign(chart.overview.moonSign)}
              detail={
                moon
                  ? `${moon.nakshatra} · pada ${moon.pada}`
                  : undefined
              }
            />
            <Stat
              label={t("astroSun")}
              value={labelSign(chart.overview.sunSign)}
            />
            <div className="border border-[var(--brass)]/35 bg-[var(--brass)]/5 px-4 py-4">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                {t("astroCurrentDasha")}
              </p>
              <p className="mt-1 font-display text-xl text-[var(--text)]">
                {chart.overview.currentMaha
                  ? labelPlanet(chart.overview.currentMaha.lord)
                  : "—"}
                {chart.overview.currentAntar
                  ? ` / ${labelPlanet(chart.overview.currentAntar.lord)}`
                  : ""}
                {chart.overview.currentPratyantar
                  ? ` / ${labelPlanet(chart.overview.currentPratyantar.lord)}`
                  : ""}
              </p>
              {chart.overview.currentMaha ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {t("astroMaha")}: {chart.overview.currentMaha.start} →{" "}
                  {chart.overview.currentMaha.end}
                  {chart.overview.currentAntar
                    ? ` · ${t("astroAntar")}: ${chart.overview.currentAntar.start} → ${chart.overview.currentAntar.end}`
                    : ""}
                  {chart.overview.currentPratyantar
                    ? ` · ${t("astroPratyantar")}: ${chart.overview.currentPratyantar.start} → ${chart.overview.currentPratyantar.end}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>

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
              <button
                key={b.lifeArea}
                type="button"
                onClick={() => setTab("predictions")}
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
          <NorthIndianChart chart={chart} legend={t("astroChartLegend")} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                  <th className="py-2 pr-3 font-medium">{t("astroPlanet")}</th>
                  <th className="py-2 pr-3 font-medium">{t("astroSign")}</th>
                  <th className="py-2 pr-3 font-medium">{t("astroDegree")}</th>
                  <th className="py-2 pr-3 font-medium">{t("astroLon")}</th>
                  <th className="py-2 pr-3 font-medium">{t("astroNakshatra")}</th>
                  <th className="py-2 pr-3 font-medium">{t("astroNakLord")}</th>
                  <th className="py-2 pr-3 font-medium">{t("astroHouse")}</th>
                  <th className="py-2 font-medium">R</th>
                </tr>
              </thead>
              <tbody>
                {chart.ascendant ? (
                  <PlanetRow
                    label={labelPlanet("ascendant")}
                    p={chart.ascendant}
                    labelSign={labelSign}
                    labelPlanet={labelPlanet}
                  />
                ) : null}
                {chart.planets.map((p) => (
                  <PlanetRow
                    key={p.id}
                    label={labelPlanet(p.id)}
                    p={p}
                    labelSign={labelSign}
                    labelPlanet={labelPlanet}
                  />
                ))}
              </tbody>
            </table>
          </div>

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
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {tab === "predictions" ? (
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {t("astroVerdictStrip")}
            </p>
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
                      {b.dashaSupports ? ` · ${t("astroDashaActive")}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--text-muted)]">{b.timing}</p>
                </div>
              ))}
            </div>
          </div>

          {!chart.predictionsText ? (
            <div className="space-y-3">
              <p className="text-[var(--text-muted)]">{t("astroPredBlurb")}</p>
              <button
                type="button"
                onClick={() => loadPredictions(false)}
                disabled={predBusy || !onRequestPredictions}
                className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)] disabled:opacity-50"
              >
                {predBusy ? t("astroWorking") : t("astroGeneratePred")}
              </button>
              {predError ? (
                <p className="text-sm text-red-400">{predError}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-10">
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
                <button
                  type="button"
                  onClick={() => loadPredictions(true)}
                  disabled={predBusy}
                  className="text-xs text-[var(--brass-soft)] underline-offset-2 hover:underline disabled:opacity-50"
                >
                  {predBusy ? t("astroWorking") : t("astroRegeneratePred")}
                </button>
              </article>

              {AREA_KEYS.map((area) => {
                const row = chart.predictionsText!.areas[area];
                return (
                  <article
                    key={area}
                    className="space-y-4 border-t border-[var(--hairline)] pt-8"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
                        {t(`astroArea_${area}` as "astroArea_career")}
                      </p>
                      <h3 className="mt-1 font-display text-2xl text-[var(--text)]">
                        {row.headline}
                      </h3>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                      {row.overview}
                    </p>
                    {row.strengths.length ? (
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
                    {row.watchouts.length ? (
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
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase tracking-wider text-[var(--brass-soft)]">
                        {t("astroNearTerm")}
                      </h4>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">
                        {row.nearTerm}
                      </p>
                    </div>
                    <div className="space-y-2 border border-[var(--line)] px-3 py-3">
                      <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                        {t("astroGuidance")}
                      </h4>
                      <p className="text-sm leading-relaxed text-[var(--text)]">
                        {row.guidance}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {tab === "chat" ? (
        <section>
          <AstroChat
            memberId={memberId}
            sessionId={sessionId}
            starters={chatStarters}
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
    <div className="border border-[var(--line)] px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-[var(--text)]">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
      ) : null}
    </div>
  );
}

function PlanetRow({
  label,
  p,
  labelSign,
  labelPlanet,
}: {
  label: string;
  p: ChartPayload["planets"][number] | NonNullable<ChartPayload["ascendant"]>;
  labelSign: (s: string) => string;
  labelPlanet: (id: string) => string;
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
      <td className="py-2">{p.retrograde ? "R" : ""}</td>
    </tr>
  );
}
