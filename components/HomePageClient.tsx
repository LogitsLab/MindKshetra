"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import SpeakButton from "@/components/SpeakButton";
import { stopNarration } from "@/lib/audio/narration";

export type FeaturedVerse = {
  id: number;
  chapter: number;
  verseNumber: number;
  ref: string;
  sanskritLines: string[];
  english: string;
  hindi: string;
  nakshatra?: string | null;
};

type Props = {
  featured: FeaturedVerse;
  featuredVerses?: FeaturedVerse[];
};

type PracticeProgress = {
  done: boolean | null;
  streak: number;
  meditationDay: number | null;
  meditationDone: number;
};

type DayPanchang = {
  tithi: string;
  nakshatra: string;
};

export default function HomePageClient({
  featured,
  featuredVerses,
}: Props) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const verses = featuredVerses?.length ? featuredVerses : [featured];
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [verseIndex, setVerseIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [inView, setInView] = useState(true);
  const resumeTimerRef = useRef<number | null>(null);
  const autoplayPaused = hoverPaused || userPaused || speaking;
  const [progress, setProgress] = useState<PracticeProgress>({
    done: null,
    streak: 0,
    meditationDay: null,
    meditationDone: 0,
  });
  const [dayPanchang, setDayPanchang] = useState<DayPanchang | null>(null);

  const scrollToVerse = (index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const next =
      ((index % verses.length) + verses.length) % verses.length;
    track.scrollTo({ left: next * track.clientWidth, behavior });
    setVerseIndex(next);
  };

  const pauseAutoplayBriefly = () => {
    setUserPaused(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      setUserPaused(false);
      resumeTimerRef.current = null;
    }, 8000);
  };

  const dayLabel = (index: number) => {
    if (index === 0) return t("homeVotdToday");
    if (index === 1) return t("homeVotdYesterday");
    return t("homeVotdEarlier");
  };

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      stopNarration();
    };
  }, []);

  useEffect(() => {
    stopNarration();
    setSpeaking(false);
  }, [verseIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || verses.length < 2) return;

    const onScroll = () => {
      const width = track.clientWidth;
      if (!width) return;
      const next = Math.round(track.scrollLeft / width);
      setVerseIndex(Math.max(0, Math.min(verses.length - 1, next)));
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [verses.length]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (verses.length < 2 || autoplayPaused || !inView) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const id = window.setInterval(() => {
      setVerseIndex((current) => {
        const next = (current + 1) % verses.length;
        const track = trackRef.current;
        if (track) {
          track.scrollTo({
            left: next * track.clientWidth,
            behavior: "smooth",
          });
        }
        return next;
      });
    }, 5000);

    return () => window.clearInterval(id);
  }, [verses.length, autoplayPaused, inView]);

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
    let cancelled = false;

    fetch("/api/panchang")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.tithi || !data?.nakshatra) return;
        setDayPanchang({
          tithi: String(data.tithi),
          nakshatra: String(data.nakshatra),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

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
      icon: "/icons/paths/explore.svg",
    },
    {
      href: "/mood",
      title: t("homeMoodTitle"),
      blurb: t("homeMoodBlurb"),
      image: "/images/paths/mood.jpg",
      icon: "/icons/paths/mood.svg",
    },
    {
      href: "/meditation",
      title: t("homeMeditationTitle"),
      blurb: t("homeMeditationBlurb"),
      image: "/images/paths/meditation.jpg",
      icon: "/icons/paths/meditation.svg",
    },
    {
      href: "/madhav",
      title: t("homeMadhavTitle"),
      blurb: t("homeMadhavBlurb"),
      image: "/images/paths/madhav.jpg",
      icon: "/icons/paths/madhav.jpg",
    },
    {
      href: "/astrology",
      title: t("homeAstroTitle"),
      blurb: t("homeAstroBlurb"),
      image: "/images/paths/astrology.jpg",
      icon: "/icons/paths/astrology.svg",
    },
    {
      href: "/paths",
      title: t("homeBlockPathsTitle"),
      blurb: t("homeBlockPathsBody"),
      image: "/images/paths/paths.jpg",
      icon: "/icons/paths/paths.svg",
    },
  ];

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

  const dayLine = dayPanchang
    ? t("homeDayLine")
        .replace("{tithi}", dayPanchang.tithi)
        .replace("{nakshatra}", dayPanchang.nakshatra)
    : null;

  const practiceTiles = [
    {
      href: "/sadhana",
      title: progress.done
        ? t("sadhanaDoneToday")
        : t("sadhanaHomeLink"),
      body: progress.done
        ? progress.streak > 0
          ? t("sadhanaStreakLine").replace("{n}", String(progress.streak))
          : t("sadhanaHomeBody")
        : t("sadhanaHomeBody"),
      image: "/images/paths/sadhana.jpg",
    },
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
      image: "/images/paths/paths.jpg",
    },
    {
      href: "/panchang",
      title: t("homeBlockPanchangTitle"),
      body: dayLine ?? t("homeBlockPanchangBody"),
      image: "/images/paths/panchang-ring.jpg",
    },
    {
      href: "/account",
      title: t("homeBlockNotifTitle"),
      body: t("homeBlockNotifBody"),
      image: "/images/paths/astrology.jpg",
    },
  ];

  const togetherLinks = [
    {
      href: "/community",
      title: t("homeBlockSanghaTitle"),
      body: t("homeBlockSanghaBody"),
      image: "/images/paths/community.jpg",
    },
    {
      href: "/care",
      title: t("homeBlockCareTitle"),
      body: t("homeBlockCareBody"),
      image: "/images/paths/mood.jpg",
    },
    {
      href: "/support",
      title: t("homeBlockSupportTitle"),
      body: t("homeBlockSupportBody"),
      image: "/images/paths/paths.jpg",
    },
  ];

  return (
    <div className="home-premium relative overflow-hidden pb-10">
      <section className="home-hero hero-bleed relative flex min-h-[calc(100dvh-8rem)] flex-col justify-center overflow-hidden py-10 sm:py-16 lg:min-h-[78dvh]">
        {/* Shared site-atmosphere shows through — no second hero image plane. */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="home-hero__wash absolute inset-0" />
          <div className="home-hero__orb absolute" />
          <div className="home-hero__grain absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-10 xl:px-12">
          <div className="max-w-3xl">
            <h1 className="animate-rise whitespace-nowrap font-display text-[clamp(2.75rem,5.2vw,5.25rem)] font-semibold leading-[0.95] tracking-tight text-white">
              MindKshetra
            </h1>

            <p className="animate-rise-delay-2 mt-5 max-w-xl font-display text-[clamp(1.25rem,1.9vw,1.75rem)] leading-snug text-[var(--brass-hover)] sm:mt-6">
              {t("homeTagline")}
            </p>
            <p className="animate-rise-delay-3 mt-4 max-w-lg text-sm font-light leading-relaxed text-white/80 sm:text-base">
              {t("homeBody")}
            </p>

            <div className="animate-rise-delay-4 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sadhana"
                className="home-button home-button--primary group"
              >
                <span>{t("homeCtaPractice")}</span>
                <span className="home-arrow" aria-hidden>
                  ↗
                </span>
              </Link>
              <Link href="/madhav" className="home-button home-button--ghost">
                {t("homeCtaMadhav")}
              </Link>
              <Link
                href="/explore"
                className="min-h-12 px-2 py-3 text-sm text-white/75 underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
              >
                {t("homeCtaExplore")}
              </Link>
            </div>
          </div>
        </div>

        <a
          href="#verse"
          className="home-scroll-cue absolute bottom-7 right-6 z-20 hidden items-center gap-3 text-[10px] uppercase tracking-[.24em] text-white/44 transition hover:text-[var(--brass-soft)] sm:flex lg:right-12 xl:right-16"
        >
          <span className="home-scroll-cue__line" aria-hidden />
          {t("homeFeaturedEyebrow")}
        </a>
      </section>

      <div className="mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-10 xl:px-12">
        <section
          ref={sectionRef}
          id="verse"
          data-home-reveal
          className="home-votd home-reveal scroll-mt-20 overflow-hidden border-y border-[var(--hairline)] py-11 sm:py-14"
          aria-roledescription="carousel"
          aria-label={t("homeFeaturedEyebrow")}
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
          onFocusCapture={() => setHoverPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setHoverPaused(false);
            }
          }}
        >
          <div className="home-votd__wash" aria-hidden />

          <div className="relative z-10 mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="eyebrow text-[var(--brass)]">
              {t("homeFeaturedEyebrow")}
            </p>

            {verses.length > 1 ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" role="tablist">
                  {verses.map((verse, index) => (
                    <button
                      key={verse.id}
                      type="button"
                      role="tab"
                      aria-selected={index === verseIndex}
                      aria-label={dayLabel(index)}
                      onClick={() => {
                        pauseAutoplayBriefly();
                        scrollToVerse(index);
                      }}
                      className="home-votd__dot"
                    >
                      {index === verseIndex && !autoplayPaused && inView ? (
                        <span
                          key={`${verse.id}-${verseIndex}-go`}
                          className="home-votd__dot-progress"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-label={t("homeVotdPrev")}
                    onClick={() => {
                      pauseAutoplayBriefly();
                      scrollToVerse(verseIndex - 1);
                    }}
                    className="home-votd__nav"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label={t("homeVotdNext")}
                    onClick={() => {
                      pauseAutoplayBriefly();
                      scrollToVerse(verseIndex + 1);
                    }}
                    className="home-votd__nav"
                  >
                    →
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div
            ref={trackRef}
            className="home-votd__track relative z-10"
            onPointerDown={pauseAutoplayBriefly}
          >
            {verses.map((verse, index) => {
              const translation =
                lang === "hi" ? verse.hindi : verse.english;
              const active = index === verseIndex;
              return (
                <article
                  key={verse.id}
                  className="home-votd__slide group"
                  data-active={active ? "true" : "false"}
                  aria-roledescription="slide"
                  aria-label={`${dayLabel(index)} · ${verse.ref}`}
                >
                  <span className="home-votd__mark" aria-hidden>
                    {verse.ref.replace(/^BG\s*/i, "")}
                  </span>

                  <div className="home-votd__body">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
                        {dayLabel(index)}
                      </span>
                      <span className="text-[11px] tracking-[0.16em] text-[var(--text-muted)]">
                        {verse.ref}
                      </span>
                    </div>

                    <div className="home-votd__sanskrit mt-5">
                      {verse.sanskritLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>

                    {verse.nakshatra ? (
                      <p className="mt-4 max-w-lg text-[11px] font-light leading-4 tracking-[0.04em] text-[var(--text-muted)]">
                        {t("homeVotdNakshatra").replace(
                          "{nakshatra}",
                          verse.nakshatra
                        )}
                      </p>
                    ) : null}
                  </div>

                  <div className="home-votd__aside">
                    <p className="home-votd__translation">
                      <span aria-hidden>“</span>
                      {translation}
                      <span aria-hidden>”</span>
                    </p>
                    <div className="home-votd__actions">
                      <SpeakButton
                        text={verse.sanskritLines.join(" ")}
                        lang={lang === "hi" ? "hi" : "en"}
                        chapter={verse.chapter}
                        verseNumber={verse.verseNumber}
                        recitationOnly
                        listenLabel={t("verseListen")}
                        stopLabel={t("verseStop")}
                        unsupportedLabel={t("ttsUnsupported")}
                        onSpeakingChange={setSpeaking}
                        className="home-votd__listen"
                      />
                      <Link
                        href={`/sloka/${verse.id}`}
                        className="home-votd__cta"
                      >
                        {t("homeFeaturedDetail")}
                        <span className="home-arrow" aria-hidden>
                          ↗
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="begin"
          data-home-reveal
          className="home-reveal scroll-mt-20 border-t border-[var(--hairline)] py-14 sm:py-16"
        >
          <header className="mb-8 border-b border-[var(--hairline)] pb-7">
            <p className="eyebrow text-[var(--brass)]">{t("homePaths")}</p>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, index) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="home-path group relative flex min-h-[280px] flex-col justify-end overflow-hidden border border-[var(--line)] sm:min-h-[320px]"
              >
                <Image
                  src={entry.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="home-path__image object-cover"
                />
                <div className="home-path__scrim absolute inset-0" aria-hidden />

                <div className="relative z-10 p-6 sm:p-7">
                  <Image
                    src={entry.icon}
                    alt=""
                    width={40}
                    height={40}
                    className={`path-mark mb-3 opacity-90 transition duration-300 group-hover:-translate-y-0.5 group-hover:opacity-100 ${
                      entry.href === "/madhav"
                        ? "rounded-full object-cover ring-1 ring-[var(--brass)]/50"
                        : ""
                    }`}
                  />
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-body text-xs text-[var(--brass)]">
                        0{index + 1}
                      </span>
                      <h3 className="mt-2 font-display text-3xl text-[var(--on-media)] transition group-hover:text-[var(--brass-hover)]">
                        <span className="link-underline">{entry.title}</span>
                      </h3>
                      <p className="mt-2 text-sm font-light leading-relaxed text-[var(--on-media-muted)]">
                        {entry.blurb}
                      </p>
                    </div>
                    <span className="home-path__arrow" aria-hidden>
                      ↗
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          data-home-reveal
          className="home-reveal border-t border-[var(--hairline)] py-14 sm:py-16"
        >
          <header className="mb-6 sm:mb-7">
            <p className="eyebrow text-[var(--brass)]">
              {t("homeLifestyleEyebrow")}
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.75rem,2.6vw,2.4rem)] leading-[1.05] tracking-[-.02em] text-[var(--text)]">
              {t("homeLifestyleTitle")}
            </h2>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {practiceTiles.map((tile, index) => (
              <Link
                key={tile.href + tile.title}
                href={tile.href}
                className={`group relative flex min-h-[148px] flex-col justify-end overflow-hidden border border-[var(--line)] transition hover:border-[var(--brass)]/45 sm:min-h-[168px] ${
                  index < 2
                    ? "lg:col-span-3 lg:min-h-[220px]"
                    : "lg:col-span-2"
                }`}
              >
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover opacity-45 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-60"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[var(--media-scrim)] via-[var(--media-scrim-mid)] to-transparent"
                  aria-hidden
                />
                <div className="relative z-10 p-4 sm:p-5">
                  <h3 className="font-display text-lg text-[var(--on-media)] transition group-hover:text-[var(--brass-hover)] sm:text-xl">
                    {tile.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] font-light leading-5 text-[var(--on-media-muted)]">
                    {tile.body}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          data-home-reveal
          className="home-reveal relative mt-2 min-h-[16rem] overflow-hidden border border-[var(--line)] sm:min-h-[18rem]"
        >
          <Image
            src="/images/paths/madhav.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center opacity-75 transition duration-[1800ms] hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,9,15,.95)_0%,rgba(7,9,15,.72)_48%,rgba(7,9,15,.25)_100%)]" />
          <div className="relative z-10 flex min-h-[16rem] max-w-3xl flex-col justify-center px-6 py-8 sm:min-h-[18rem] sm:px-10 sm:py-9 lg:px-12">
            <p className="eyebrow text-[var(--brass-soft)]">
              {t("homeMadhavTitle")}
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3vw,3rem)] leading-[1] tracking-[-.03em] text-white">
              {t("homeCloseLine")}
            </h2>
            <Link
              href="/madhav"
              className="home-button home-button--primary mt-6 self-start"
            >
              <span>{t("homeCloseCta")}</span>
              <span className="home-arrow" aria-hidden>
                ↗
              </span>
            </Link>
          </div>
        </section>

        <section
          data-home-reveal
          className="home-reveal border-t border-[var(--hairline)] py-10 sm:py-12"
        >
          <div className="mb-5 text-center">
            <p className="eyebrow text-[var(--brass)]">
              {t("homeTogetherEyebrow")}
            </p>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,2.6vw,2.4rem)] leading-[1.05] tracking-[-.02em] text-[var(--text)]">
              {t("homeTogetherTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-light leading-5 text-[var(--text-soft)]">
              {t("homeTogetherBlurb")}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {togetherLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex min-h-[160px] flex-col justify-end overflow-hidden border border-[var(--line)] transition hover:border-[var(--brass)]/45 sm:min-h-[180px]"
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover opacity-45 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-60"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[var(--media-scrim)] via-[var(--media-scrim-mid)] to-transparent"
                  aria-hidden
                />
                <div className="relative z-10 p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg text-[var(--on-media)] transition group-hover:text-[var(--brass-hover)] sm:text-xl">
                      {item.title}
                    </h3>
                    <span
                      className="home-arrow shrink-0 text-[var(--brass-soft)] opacity-70 transition group-hover:opacity-100"
                      aria-hidden
                    >
                      ↗
                    </span>
                  </div>
                  <p className="text-[13px] font-light leading-5 text-[var(--on-media-muted)]">
                    {item.body}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
