"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { moodLabel } from "@/lib/mood-utils";
import { getMoodVisual } from "@/lib/moodVisuals";
import type { Mood } from "@/lib/types";

export type FeaturedVerse = {
  id: number;
  ref: string;
  sanskritLines: string[];
  english: string;
  hindi: string;
};

type Props = {
  featured: FeaturedVerse;
  previewMoods: Mood[];
};

type PracticeProgress = {
  done: boolean | null;
  streak: number;
  meditationDay: number | null;
  meditationDone: number;
};

const ENTRY_LAYOUT = [
  "lg:col-span-7 lg:row-span-2 lg:min-h-[27rem]",
  "lg:col-span-5 lg:min-h-[13rem]",
  "lg:col-span-5 lg:min-h-[13rem]",
  "lg:col-span-4 lg:min-h-[16rem]",
  "lg:col-span-4 lg:min-h-[16rem]",
  "lg:col-span-4 lg:min-h-[16rem]",
] as const;

export default function HomePageClient({ featured, previewMoods }: Props) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [progress, setProgress] = useState<PracticeProgress>({
    done: null,
    streak: 0,
    meditationDay: null,
    meditationDone: 0,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/meditation/progress?program=sitting-course")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;

        if (data.guest) {
          try {
            const raw =
              localStorage.getItem("mindkshetra-journey-sitting-course") ||
              localStorage.getItem("mindkshetra-meditation-run-foundation-7");
            const parsed = raw
              ? (JSON.parse(raw) as { completedDays?: number[] })
              : {};
            const days = Array.isArray(parsed.completedDays)
              ? parsed.completedDays
              : [];
            setProgress((current) => ({
              ...current,
              meditationDone: days.length,
              meditationDay: days.length ? Math.max(...days) + 1 : 1,
            }));
          } catch {
            setProgress((current) => ({
              ...current,
              meditationDone: 0,
              meditationDay: 1,
            }));
          }
          return;
        }

        setProgress((current) => ({
          ...current,
          meditationDone:
            (data.completedDays as number[] | undefined)?.length ?? 0,
          meditationDay: Number(data.currentDay) || 1,
        }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProgress((current) => ({ ...current, done: null, streak: 0 }));
      return;
    }

    let cancelled = false;
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timezone = undefined;
    }

    fetch(
      `/api/sadhana${timezone ? `?tz=${encodeURIComponent(timezone)}` : ""}`
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const flow = (data.streaks ?? []).find(
          (item: { practice?: string }) => item.practice === "flow"
        );
        setProgress((current) => ({
          ...current,
          done: Boolean(data.doneToday?.includes?.("flow")),
          streak: Number(flow?.current) || 0,
        }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home-premium");
    root?.classList.add("home-motion-ready");
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-home-reveal]")
    );
    if (!sections.length || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      root?.classList.remove("home-motion-ready");
    };
  }, []);

  const entries = [
    {
      href: "/explore",
      title: t("homeExploreTitle"),
      blurb: t("homeExploreBlurb"),
      image: "/images/paths/explore.jpg",
      eyebrow: "Explore",
    },
    {
      href: "/mood",
      title: t("homeMoodTitle"),
      blurb: t("homeMoodBlurb"),
      image: "/images/paths/mood.jpg",
      eyebrow: "The spectrum",
    },
    {
      href: "/meditation",
      title: t("homeMeditationTitle"),
      blurb: t("homeMeditationBlurb"),
      image: "/images/paths/meditation.jpg",
      eyebrow: "Silent sit",
    },
    {
      href: "/madhav",
      title: t("homeMadhavTitle"),
      blurb: t("homeMadhavBlurb"),
      image: "/images/paths/madhav.jpg",
      eyebrow: "Ask Madhav",
    },
    {
      href: "/astrology",
      title: t("homeAstroTitle"),
      blurb: t("homeAstroBlurb"),
      image: "/images/paths/astrology.jpg",
      eyebrow: "Cosmic chart",
    },
    {
      href: "/paths",
      title: lang === "hi" ? "मार्ग" : "Paths",
      blurb: t("homeBlockPathsBody"),
      image: "/images/paths/paths.jpg",
      eyebrow: "Journeys",
    },
  ];

  const translation = lang === "hi" ? featured.hindi : featured.english;
  const sitTotal = 45;
  const sitDone = Math.min(sitTotal, Math.max(0, progress.meditationDone));
  const sitDay = Math.min(
    sitTotal,
    Math.max(1, progress.meditationDay ?? 1)
  );
  const sitHref =
    progress.meditationDay == null
      ? "/meditation"
      : `/meditation/${sitDay}`;
  const sitLabel =
    progress.meditationDone === 0
      ? t("medHomeStart")
      : t("medHomeContinue").replace("{n}", String(sitDay));
  const sitProgressLabel = t("medProgress")
    .replace("{done}", String(sitDone))
    .replace("{total}", String(sitTotal));
  const ringCircumference = 2 * Math.PI * 22;
  const ringOffset =
    ringCircumference * (1 - Math.max(0, sitDone) / sitTotal);

  const practiceLinks = [
    {
      href: sitHref,
      title: sitLabel,
      body: sitProgressLabel,
      image: "/images/paths/meditation.jpg",
    },
    {
      href: "/sadhana#japa",
      title: t("homeBlockJapaTitle"),
      body: t("homeBlockJapaBody"),
      image: "/images/paths/sadhana.jpg",
    },
    {
      href: "/panchang",
      title: t("homeBlockPanchangTitle"),
      body: t("homeBlockPanchangBody"),
      image: "/images/paths/panchang-ring.jpg",
    },
  ];

  const togetherLinks = [
    {
      href: "/community",
      title: t("homeBlockSanghaTitle"),
      body: t("homeBlockSanghaBody"),
    },
    {
      href: "/care",
      title: t("homeBlockCareTitle"),
      body: t("homeBlockCareBody"),
    },
    {
      href: "/support",
      title: t("homeBlockSupportTitle"),
      body: t("homeBlockSupportBody"),
    },
    {
      href: "/account",
      title: t("homeBlockNotifTitle"),
      body: t("homeBlockNotifBody"),
    },
  ];

  return (
    <div className="home-premium relative overflow-hidden pb-10">
      <section className="home-hero hero-bleed relative min-h-[88dvh] overflow-hidden lg:min-h-[82dvh]">
        <div className="absolute inset-0">
          <Image
            src="/images/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-ken object-cover object-[center_44%]"
          />
          <div className="home-hero__wash absolute inset-0" aria-hidden />
          <div className="home-hero__orb absolute" aria-hidden />
          <div className="home-hero__grain absolute inset-0" aria-hidden />
        </div>

        <div className="relative z-10 mx-auto grid min-h-[88dvh] w-full max-w-[80rem] grid-cols-[minmax(0,1fr)] items-end gap-9 px-5 pb-10 pt-24 sm:px-8 sm:pb-12 lg:min-h-[82dvh] lg:grid-cols-[minmax(0,1.08fr)_minmax(21rem,.72fr)] lg:gap-12 lg:px-10 lg:pb-14 xl:px-12">
          <div className="min-w-0 max-w-4xl">
            <div className="animate-rise flex items-center gap-4 sm:gap-5">
              <Image
                src="/brand/mark.svg"
                alt=""
                width={52}
                height={52}
                className="hero-lotus h-11 w-11 shrink-0 sm:h-[3.25rem] sm:w-[3.25rem]"
                priority
              />
              <h1 className="max-w-4xl whitespace-nowrap font-display text-[clamp(2.75rem,5.2vw,5.25rem)] font-medium leading-[0.9] tracking-[-0.05em] text-[var(--on-media)]">
                Mind
                <span className="italic text-[var(--brass-soft)]">
                  Kshetra
                </span>
              </h1>
            </div>

            <p className="animate-rise-delay-2 mt-7 max-w-xl font-display text-[clamp(1.25rem,1.9vw,1.75rem)] leading-[1.22] text-white/92">
              {t("homeTagline")}
            </p>
            <p className="animate-rise-delay-3 mt-4 max-w-lg text-sm font-light leading-6 text-white/64 sm:text-[15px]">
              {t("homeBody")}
            </p>

            <div className="animate-rise-delay-4 mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/madhav"
                className="home-button home-button--primary group"
              >
                <span>{t("homeCtaMadhav")}</span>
                <span className="home-arrow" aria-hidden>
                  ↗
                </span>
              </Link>
              <Link href="/mood" className="home-button home-button--ghost">
                {t("homeMoodsTitle")}
              </Link>
            </div>
          </div>

          <aside className="animate-rise-delay-3 home-verse min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow text-[var(--brass-soft)]">
                  {t("homeFeaturedEyebrow")}
                </p>
                <p className="mt-2 text-[11px] tracking-[.14em] text-white/45">
                  {featured.ref}
                </p>
              </div>
              <div className="relative flex h-12 w-12 items-center justify-center">
                <svg
                  className="-rotate-90 text-[var(--brass-soft)]"
                  viewBox="0 0 56 56"
                  width="48"
                  height="48"
                  aria-hidden
                >
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity=".2"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="hero-progress-ring__value"
                  />
                </svg>
                <Image
                  src="/brand/mark.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="absolute opacity-85"
                />
              </div>
            </div>

            <p className="mt-6 font-devanagari text-xl leading-[1.5] text-[var(--brass-soft)] sm:text-[1.4rem]">
              {featured.sanskritLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p className="mt-4 font-display text-base italic leading-relaxed text-white/82 sm:text-lg">
              “{translation}”
            </p>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-4 text-[13px]">
              <Link
                href={`/sloka/${featured.id}`}
                className="text-[var(--brass-soft)] transition hover:text-white"
              >
                {t("homeFeaturedDetail")} ↗
              </Link>
              <Link
                href={sitHref}
                className="text-white/58 transition hover:text-white"
              >
                {sitLabel}
              </Link>
            </div>
          </aside>
        </div>

        <a
          href="#begin"
          className="home-scroll-cue absolute bottom-7 right-6 z-20 hidden items-center gap-3 text-[10px] uppercase tracking-[.24em] text-white/44 transition hover:text-[var(--brass-soft)] sm:flex lg:right-12 xl:right-16"
        >
          <span className="home-scroll-cue__line" aria-hidden />
          {t("homePaths")}
        </a>
      </section>

      <div className="mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-10 xl:px-12">
        <section
          id="begin"
          data-home-reveal
          className="home-reveal scroll-mt-20 py-14 sm:py-16"
        >
          <header className="mb-9 grid gap-4 border-b border-[var(--hairline)] pb-7 lg:grid-cols-[1fr_1.4fr] lg:items-end">
            <p className="eyebrow text-[var(--brass)]">{t("homePaths")}</p>
            <h2 className="max-w-3xl font-display text-[clamp(2rem,3.2vw,3.2rem)] leading-[1] tracking-[-.025em] text-[var(--text)]">
              {t("homeMoodsTitle")}
            </h2>
          </header>

          <div className="grid gap-3 lg:grid-cols-12">
            {entries.map((entry, index) => (
              <Link
                key={entry.href}
                href={entry.href}
                className={`home-path group relative flex min-h-[18rem] flex-col justify-between overflow-hidden border border-[var(--line)] p-6 sm:p-6 ${ENTRY_LAYOUT[index]}`}
              >
                <Image
                  src={entry.image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="home-path__image object-cover"
                />
                <div className="home-path__scrim absolute inset-0" aria-hidden />

                {index === 0 ? (
                  <p className="eyebrow relative z-10 text-white/68">
                    {entry.eyebrow}
                  </p>
                ) : (
                  <span aria-hidden />
                )}

                <div className="relative z-10 max-w-xl">
                  <div className="flex items-end justify-between gap-5">
                    <h3
                      className={`font-display leading-[.96] tracking-[-.035em] text-white transition duration-500 group-hover:text-[var(--brass-soft)] ${
                        index === 0
                          ? "text-[clamp(2.15rem,3.5vw,3rem)]"
                          : "text-[clamp(1.65rem,2.4vw,2rem)]"
                      }`}
                    >
                      {entry.title}
                    </h3>
                    <span className="home-path__arrow" aria-hidden>
                      ↗
                    </span>
                  </div>
                  <p
                    className={`max-w-md text-[13px] font-light leading-5 text-white/68 sm:text-sm ${
                      index === 0
                        ? "mt-4"
                        : "mt-0 max-h-0 translate-y-2 overflow-hidden opacity-0 transition-all duration-500 group-hover:mt-3 group-hover:max-h-16 group-hover:translate-y-0 group-hover:opacity-100"
                    }`}
                  >
                    {entry.blurb}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          data-home-reveal
          className="home-reveal border-t border-[var(--hairline)] py-14 sm:py-16"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,.9fr)_minmax(30rem,1.1fr)] lg:gap-14">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="eyebrow text-[var(--brass)]">
                {t("homeLifestyleEyebrow")}
              </p>
              <h2 className="mt-4 max-w-xl font-display text-[clamp(2.1rem,3.2vw,3.2rem)] leading-[1] tracking-[-.03em] text-[var(--text)]">
                {t("homeLifestyleTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-sm font-light leading-6 text-[var(--text-soft)]">
                {t("homeLifestyleBlurb")}
              </p>

              <Link
                href="/sadhana"
                className="group mt-8 block border-l border-[var(--brass)] py-1 pl-5"
              >
                <p className="eyebrow text-[var(--brass-soft)]">
                  {t("sadhanaEyebrow")}
                </p>
                <p className="mt-2 font-display text-xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                  {t("sadhanaHomeLink")} ↗
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                  {progress.done
                    ? t("sadhanaDoneToday")
                    : t("sadhanaHomeBody")}
                </p>
                {progress.streak > 0 ? (
                  <p className="mt-4 text-xs tracking-[.12em] text-[var(--brass-soft)]">
                    {t("sadhanaStreakLine").replace(
                      "{n}",
                      String(progress.streak)
                    )}
                  </p>
                ) : null}
              </Link>
            </div>

            <div className="border-t border-[var(--hairline)]">
              {practiceLinks.map((item, index) => (
                <Link
                  key={item.href + item.title}
                  href={item.href}
                  className="home-practice-row group grid gap-4 border-b border-[var(--hairline)] py-5 sm:grid-cols-[3rem_6rem_1fr_auto] sm:items-center"
                >
                  <span className="font-display text-lg italic text-[var(--text-muted)]">
                    0{index + 1}
                  </span>
                  <span className="relative hidden aspect-[4/3] overflow-hidden sm:block">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover opacity-65 grayscale-[25%] transition duration-700 group-hover:scale-105 group-hover:opacity-90 group-hover:grayscale-0"
                    />
                  </span>
                  <span>
                    <span className="block font-display text-lg text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                      {item.title}
                    </span>
                    <span className="mt-2 block text-sm font-light leading-6 text-[var(--text-soft)]">
                      {item.body}
                    </span>
                  </span>
                  <span className="home-arrow text-[var(--brass)]" aria-hidden>
                    ↗
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          data-home-reveal
          className="home-reveal border-t border-[var(--hairline)] py-14 sm:py-16"
        >
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-14">
            <div>
              <p className="eyebrow text-[var(--brass)]">
                {t("homeMoodsEyebrow")}
              </p>
              <h2 className="mt-4 font-display text-[clamp(2.1rem,3.2vw,3.2rem)] leading-[1] tracking-[-.03em] text-[var(--text)] sm:whitespace-nowrap">
                {t("homeMoodsTitle")}
              </h2>
              <p className="mt-4 max-w-md text-sm font-light leading-6 text-[var(--text-soft)]">
                {t("homeMoodsBlurb")}
              </p>
              <Link
                href="/mood"
                className="mt-8 inline-flex items-center gap-3 text-sm text-[var(--brass-soft)] transition hover:text-[var(--text)]"
              >
                {t("homeMoodsAll")} <span aria-hidden>↗</span>
              </Link>
            </div>

            <div className="grid border-t border-[var(--hairline)] sm:grid-cols-2">
              {previewMoods.map((mood, index) => {
                const visual = getMoodVisual(mood);
                return (
                  <Link
                    key={mood.id}
                    href={`/mood/${mood.id}`}
                    className={`home-mood group relative flex min-h-24 items-center justify-between overflow-hidden border-b border-[var(--hairline)] px-5 py-4 sm:min-h-28 sm:px-6 ${
                      index % 2 === 0
                        ? "sm:border-r sm:border-[var(--hairline)]"
                        : ""
                    }`}
                  >
                    <span
                      className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(ellipse at 85% 20%, color-mix(in srgb, ${visual.accent} 18%, transparent), transparent 62%)`,
                      }}
                      aria-hidden
                    />
                    <span className="relative">
                      <span className="block text-[10px] tracking-[.18em] text-[var(--text-muted)]">
                        0{index + 1}
                      </span>
                      <span className="mt-2 block font-display text-lg text-[var(--text)] transition group-hover:translate-x-1 group-hover:text-[var(--brass-soft)] sm:text-xl">
                        {moodLabel(mood, lang)}
                      </span>
                    </span>
                    <span
                      className="relative h-9 w-9 opacity-55 transition duration-500 group-hover:scale-110 group-hover:opacity-100"
                      style={{
                        backgroundColor: visual.accent,
                        WebkitMask: `url(${visual.icon}) center / contain no-repeat`,
                        mask: `url(${visual.icon}) center / contain no-repeat`,
                      }}
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section
          data-home-reveal
          className="home-reveal border-t border-[var(--hairline)] py-14 sm:py-16"
        >
          <div className="mb-9 grid gap-4 lg:grid-cols-[.6fr_1.4fr] lg:items-end">
            <p className="eyebrow text-[var(--brass)]">
              {t("homeTogetherEyebrow")}
            </p>
            <div>
              <h2 className="font-display text-[clamp(2.1rem,3.2vw,3.2rem)] leading-[1] tracking-[-.03em] text-[var(--text)]">
                {t("homeTogetherTitle")}
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-light leading-6 text-[var(--text-soft)]">
                {t("homeTogetherBlurb")}
              </p>
            </div>
          </div>

          <div className="grid border-y border-[var(--hairline)] md:grid-cols-2 xl:grid-cols-4">
            {togetherLinks.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className="group min-h-44 border-b border-[var(--hairline)] p-5 transition hover:bg-[var(--surface)] md:odd:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-lg italic text-[var(--text-muted)]">
                    0{index + 1}
                  </span>
                  <span
                    className="home-arrow text-[var(--brass)] opacity-55 transition group-hover:opacity-100"
                    aria-hidden
                  >
                    ↗
                  </span>
                </div>
                <h3 className="mt-7 font-display text-lg text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] font-light leading-5 text-[var(--text-soft)]">
                  {item.body}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section
          data-home-reveal
          className="home-reveal relative mb-4 min-h-[22rem] overflow-hidden border border-[var(--line)]"
        >
          <Image
            src="/images/paths/madhav.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center opacity-75 transition duration-[1800ms] hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,9,15,.95)_0%,rgba(7,9,15,.72)_48%,rgba(7,9,15,.25)_100%)]" />
          <div className="relative z-10 flex min-h-[22rem] max-w-3xl flex-col justify-center px-7 py-10 sm:px-10 lg:px-12">
            <p className="eyebrow text-[var(--brass-soft)]">
              {t("homeMadhavTitle")}
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,3.6vw,3.6rem)] leading-[1] tracking-[-.03em] text-white">
              {t("homeCloseLine")}
            </h2>
            <Link
              href="/madhav"
              className="home-button home-button--primary mt-9 self-start"
            >
              <span>{t("homeCloseCta")}</span>
              <span className="home-arrow" aria-hidden>
                ↗
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
