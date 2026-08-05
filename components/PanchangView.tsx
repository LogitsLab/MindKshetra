"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ImmersiveHero from "@/components/ImmersiveHero";
import { useLanguage } from "@/components/LanguageProvider";
import EmptyState from "@/components/EmptyState";
import { SkeletonPanel } from "@/components/Skeleton";

type DailyPanchang = {
  tithi: string;
  tithiIndex: number;
  nakshatra: string;
  pada: number;
  yoga: string;
  karana: string;
  vaar: string;
  date: string;
  ianaTz: string;
  sunrise: string | null;
  sunset: string | null;
  tithiEndsAt: string | null;
  nakshatraEndsAt: string | null;
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
};

/** "2026-07-31T18:42:10+05:30" → "18:42" (already in the location's zone). */
function clockOf(iso: string | null): string | null {
  const m = iso?.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

export default function PanchangView() {
  const { t } = useLanguage();
  const [panchang, setPanchang] = useState<DailyPanchang | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/panchang")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data) => {
        if (cancelled) return;
        setPanchang(data as DailyPanchang);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="life-hub pb-10">
        <ImmersiveHero
          image="/images/paths/panchang-ring.jpg"
          eyebrow={t("panchangEyebrow")}
          title={t("panchangTitle")}
          intro={t("panchangIntro")}
        />
        <SkeletonPanel label={t("loading")} />
      </div>
    );
  }

  if (state === "error" || !panchang) {
    return (
      <div className="life-hub pb-10">
        <ImmersiveHero
          image="/images/paths/panchang-ring.jpg"
          eyebrow={t("panchangEyebrow")}
          title={t("panchangTitle")}
          intro={t("panchangIntro")}
        />
        <EmptyState
          title={t("panchangUnavailable")}
          body={t("panchangUnavailableBody")}
        />
      </div>
    );
  }

  const special = panchang.isEkadashi
    ? t("panchangEkadashiToday").replace("{tithi}", panchang.tithi)
    : panchang.isPurnima
      ? t("panchangPurnimaToday")
      : panchang.isAmavasya
        ? t("panchangAmavasyaToday")
        : null;

  const limbs: Array<{ label: string; value: string; until?: string | null }> =
    [
      {
        label: t("astroTithi"),
        value: panchang.tithi,
        until: clockOf(panchang.tithiEndsAt),
      },
      {
        label: t("astroNakshatra"),
        value: `${panchang.nakshatra} · ${t("panchangPada")} ${panchang.pada}`,
        until: clockOf(panchang.nakshatraEndsAt),
      },
      { label: t("astroYoga"), value: panchang.yoga },
      { label: t("astroKarana"), value: panchang.karana },
      { label: t("panchangVaar"), value: panchang.vaar },
    ];

  return (
    <div className="life-hub pb-10">
      <ImmersiveHero
        image="/images/paths/panchang-ring.jpg"
        eyebrow={t("panchangEyebrow")}
        title={t("panchangTitle")}
        intro={t("panchangIntro")}
        meta={
          <div>
            <p className="text-xs tracking-[0.12em] text-white/55">
              {t("panchangLocationLine")}
            </p>
            <p className="mt-2 font-display text-2xl text-white">
              {panchang.tithi}
              <span className="text-white/50"> · </span>
              {panchang.nakshatra}
            </p>
            {special ? (
              <p className="mt-2 text-sm text-[var(--brass-soft)]">{special}</p>
            ) : null}
            <p className="mt-3 text-sm text-white/60">
              {t("panchangSunrise")} {clockOf(panchang.sunrise) ?? "—"}
              {" · "}
              {t("panchangSunset")} {clockOf(panchang.sunset) ?? "—"}
            </p>
          </div>
        }
        actions={
          <Link
            href="/panchang/calendar"
            className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            {t("panchangCalendarLink")}
          </Link>
        }
      />

      <section>
        <p className="eyebrow text-[var(--brass)]">{t("panchangEyebrow")}</p>
        <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
          {t("panchangTitle")}
        </h2>
        <div className="med-hub__days mt-6">
          {limbs.map((limb) => (
            <div key={limb.label} className="med-hub__day">
              <p className="text-[11px] tracking-[0.16em] text-[var(--brass-soft)]">
                {limb.label}
              </p>
              <p className="mt-2 font-display text-xl text-[var(--text)]">
                {limb.value}
              </p>
              {limb.until ? (
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {t("panchangUntil")} {limb.until}
                </p>
              ) : (
                <p className="mt-3 text-xs text-[var(--text-muted)]">&nbsp;</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 max-w-2xl text-sm font-light text-[var(--text-muted)]">
        {t("panchangConvention")}
      </p>
      <p className="mt-6 text-sm text-[var(--text-muted)]">
        <Link
          href="/astrology"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("homeAstroTitle")}
        </Link>
        {" · "}
        <Link
          href="/sadhana"
          className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("sadhanaTitle")}
        </Link>
      </p>
    </div>
  );
}
