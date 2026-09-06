"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ImmersiveHero from "@/components/ImmersiveHero";
import { useLanguage } from "@/components/LanguageProvider";
import EmptyState from "@/components/EmptyState";
import SpeakButton from "@/components/SpeakButton";
import { SkeletonPanel } from "@/components/Skeleton";
import { loreForPanchang, pickBlurb } from "@/lib/panchang-lore";

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
  festivals?: Array<{
    id: string;
    labelEn: string;
    labelHi: string;
    storyEn?: string;
    storyHi?: string;
    verseRef?: string;
  }>;
};

type VotdPayload = {
  id: number;
  ref: string;
  sloka?: {
    chapter: number;
    verse_number: number;
    sanskrit_devanagari: string;
    english_translation: string;
    hindi_translation: string;
  };
};

/** "2026-07-31T18:42:10+05:30" → "18:42" (already in the location's zone). */
function clockOf(iso: string | null): string | null {
  const m = iso?.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

export default function PanchangView() {
  const { t, lang } = useLanguage();
  const [panchang, setPanchang] = useState<DailyPanchang | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [votd, setVotd] = useState<VotdPayload | null>(null);

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
    fetch("/api/votd/today?full=1")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data) => {
        if (!cancelled) setVotd(data as VotdPayload);
      })
      .catch(() => {
        /* verse card is optional */
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

  const lore = loreForPanchang(panchang);
  const festival = panchang.festivals?.[0];
  const festivalStory =
    festival && (lang === "hi" ? festival.storyHi : festival.storyEn);

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

      <section className="mt-10">
        <p className="eyebrow text-[var(--brass)]">{t("panchangWhyTitle")}</p>
        <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
          {t("panchangWhyTitle")}
        </h2>
        {festival ? (
          <div className="mt-6 border border-[var(--line)] px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--brass-soft)]">
              {t("panchangFestivalStory")}
            </p>
            <p className="mt-2 font-display text-xl text-[var(--text)]">
              {lang === "hi" ? festival.labelHi : festival.labelEn}
            </p>
            {festivalStory ? (
              <p className="mt-3 max-w-2xl text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
                {festivalStory}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 max-w-2xl space-y-4 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {lore.special ? <p>{pickBlurb(lore.special, lang)}</p> : null}
          {lore.tithi ? <p>{pickBlurb(lore.tithi, lang)}</p> : null}
          {lore.nakshatra ? <p>{pickBlurb(lore.nakshatra, lang)}</p> : null}
          {lore.vaar ? <p>{pickBlurb(lore.vaar, lang)}</p> : null}
        </div>
      </section>

      {votd?.sloka ? (
        <section className="mt-10">
          <p className="eyebrow text-[var(--brass)]">{t("panchangVotdTitle")}</p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
            {votd.ref}
          </h2>
          <p className="mt-4 font-display text-xl text-[var(--text)]">
            {votd.sloka.sanskrit_devanagari}
          </p>
          <p className="mt-3 max-w-2xl text-[15px] font-light text-[var(--text-muted)]">
            {lang === "hi"
              ? votd.sloka.hindi_translation
              : votd.sloka.english_translation}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <SpeakButton
              text={votd.sloka.sanskrit_devanagari}
              lang={lang}
              listenLabel={t("verseListen")}
              stopLabel={t("verseStop")}
              unsupportedLabel={t("ttsUnsupported")}
              chapter={votd.sloka.chapter}
              verseNumber={votd.sloka.verse_number}
              recitationOnly
            />
            <Link
              href={`/sloka/${votd.id}`}
              className="text-sm text-[var(--brass-soft)] hover:underline"
            >
              {t("homeFeaturedDetail")} →
            </Link>
          </div>
        </section>
      ) : null}

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
