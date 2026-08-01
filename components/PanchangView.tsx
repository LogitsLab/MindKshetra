"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
      <SkeletonPanel label={t("loading")} />
    );
  }

  if (state === "error" || !panchang) {
    return (
      <EmptyState
        title={t("panchangUnavailable")}
        body={t("panchangUnavailableBody")}
      />
    );
  }

  const special = panchang.isEkadashi
    ? t("panchangEkadashiToday").replace("{tithi}", panchang.tithi)
    : panchang.isPurnima
      ? t("panchangPurnimaToday")
      : panchang.isAmavasya
        ? t("panchangAmavasyaToday")
        : null;

  const rows: Array<{ label: string; value: string; until?: string | null }> = [
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
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {t("panchangLocationLine")}
      </p>
      {special ? (
        <p className="mb-6 border-l-2 border-[var(--brass)]/60 pl-4 font-display text-lg text-[var(--text)]">
          {special}
        </p>
      ) : null}

      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] py-4"
          >
            <dt className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {row.label}
            </dt>
            <dd className="text-right">
              <span className="font-display text-lg text-[var(--text)]">
                {row.value}
              </span>
              {row.until ? (
                <span className="ml-2 text-sm text-[var(--text-muted)]">
                  {t("panchangUntil")} {row.until}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] py-4">
          <dt className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("panchangSunrise")} · {t("panchangSunset")}
          </dt>
          <dd className="font-display text-lg text-[var(--text)]">
            {clockOf(panchang.sunrise) ?? "—"} · {clockOf(panchang.sunset) ?? "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-8 border-t border-[var(--hairline)] pt-4 text-sm font-light text-[var(--text-muted)]">
        {t("panchangConvention")}
      </p>
      <p className="mt-4">
        <Link
          href="/panchang/calendar"
          className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          {t("panchangCalendarLink")} →
        </Link>
      </p>
    </div>
  );
}
