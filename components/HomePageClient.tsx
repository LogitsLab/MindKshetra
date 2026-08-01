"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useProgress } from "@/components/ProgressProvider";
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

export default function HomePageClient({ featured, previewMoods }: Props) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const { continueSlokaId } = useProgress();
  const [streak, setStreak] = useState(0);
  // null = not known yet; the card shows its invitation and never an error.
  const [sadhanaDone, setSadhanaDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setStreak(0);
      return;
    }
    fetch("/api/account/streak", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setStreak(Number(d.current) || 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    // Signed-out visitors get a guaranteed empty summary from this route —
    // skip the no-op serverless hit on the highest-traffic page, and refresh
    // when the session changes so the done-state follows sign-in.
    if (!user) {
      setSadhanaDone(null);
      return;
    }
    let cancelled = false;
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = undefined;
    }
    fetch(`/api/sadhana${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setSadhanaDone(Boolean(data.doneToday?.includes?.("flow")));
        }
      })
      .catch(() => {
        /* home never shows a practice error — the invitation stands */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
  ];

  const translation = lang === "hi" ? featured.hindi : featured.english;

  return (
    <div className="relative">
      {/* Hero — cinematic text over the field (no white card) */}
      <section className="relative flex min-h-[calc(100dvh-8rem)] flex-col justify-center py-8 sm:py-16">
        <div className="hero-bleed pointer-events-none absolute inset-y-0 -z-10">
          <div
            className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"
            aria-hidden
          />
        </div>

        <p
          className="watermark-sanskrit pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[18vw] leading-none text-white/[0.06] sm:text-[9rem]"
          aria-hidden
        >
          मनः
        </p>

        <div className="relative z-10 max-w-3xl">
          <h1 className="animate-rise-delay-1 font-display text-[2.75rem] font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl md:text-8xl">
            MindKshetra
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-xl font-display text-lg leading-snug text-[var(--brass-hover)] sm:mt-5 sm:text-2xl md:text-3xl">
            {t("homeTagline")}
          </p>
          <p className="animate-rise-delay-3 mt-4 max-w-lg text-[0.95rem] font-light leading-relaxed text-white/80 sm:mt-6 sm:text-lg">
            {t("homeBody")}
          </p>

          <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
            {continueSlokaId ? (
              <Link
                href={`/sloka/${continueSlokaId}`}
                className="min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("continueReading")}
              </Link>
            ) : (
              <Link
                href="/sadhana"
                className="min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("homeCtaPractice")}
              </Link>
            )}
            <Link
              href="/madhav"
              className="min-h-11 border border-white/35 bg-white/10 px-6 py-3 text-sm text-white backdrop-blur-sm transition hover:border-[var(--brass)]/60 hover:bg-white/15"
            >
              {t("homeCtaMadhav")}
            </Link>
            <Link
              href="/explore"
              className="min-h-11 px-2 py-3 text-sm text-white/75 underline-offset-4 transition hover:text-[var(--brass-hover)] hover:underline"
            >
              {t("homeCtaExplore")}
            </Link>
          </div>
        </div>
      </section>

      {/* Paths with images */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-8 text-xs uppercase tracking-[0.22em] text-[var(--brass)] drop-shadow-sm">
          {t("homePaths")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="group relative flex min-h-[280px] flex-col justify-end overflow-hidden border border-[var(--line)] sm:min-h-[320px]"
            >
              <Image
                src={entry.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover opacity-70 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-85"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[var(--media-scrim)] via-[var(--media-scrim-mid)] to-[var(--media-scrim-soft)]"
                aria-hidden
              />
              <div className="relative z-10 p-6 sm:p-7">
                <Image
                  src={entry.icon}
                  alt=""
                  width={40}
                  height={40}
                  className={`path-mark mb-3 opacity-90 transition duration-300 group-hover:-translate-y-0.5 group-hover:opacity-100 ${
                    entry.href === "/madhav" ? "rounded-full object-cover ring-1 ring-[var(--brass)]/50" : ""
                  }`}
                />
                <span className="font-body text-xs text-[var(--brass)]">
                  0{i + 1}
                </span>
                <h2 className="mt-2 font-display text-3xl text-[var(--on-media)] transition group-hover:text-[var(--brass-hover)]">
                  <span className="link-underline">{entry.title}</span>
                </h2>
                <p className="mt-2 text-sm font-light leading-relaxed text-[var(--on-media-muted)]">
                  {entry.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Today's practice — flagship + lifestyle grid */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--brass)]">
          {t("homeLifestyleEyebrow")}
        </p>
        <h2 className="font-display text-3xl text-[var(--text)] sm:text-4xl">
          {t("homeLifestyleTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-[var(--text-soft)] sm:text-base">
          {t("homeLifestyleBlurb")}
        </p>

        <Link
          href="/sadhana"
          className="group mt-8 block border border-[var(--line)] transition hover:border-[var(--brass)]/40"
        >
          <div className="border-l-2 border-[var(--brass)]/70 px-6 py-8 sm:px-8 sm:py-9">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass)]">
              {t("sadhanaEyebrow")}
            </p>
            <h3 className="mt-3 font-display text-3xl text-[var(--text)] transition group-hover:text-[var(--brass-hover)] sm:text-4xl">
              {t("sadhanaHomeLink")}
            </h3>
            <p
              className={`mt-2 max-w-xl text-sm font-light leading-relaxed sm:text-base ${
                sadhanaDone === true
                  ? "text-[var(--brass-soft)]"
                  : "text-[var(--text-soft)]"
              }`}
            >
              {sadhanaDone === true ? t("sadhanaDoneToday") : t("sadhanaHomeBody")}
            </p>
            {streak > 0 ? (
              <p
                className="mt-4 text-xs tracking-[0.12em] text-[var(--brass-soft)]"
                title={t("streakLabel")}
              >
                {streak} {t("homeStreakLabel")}
              </p>
            ) : null}
          </div>
        </Link>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                href: "/meditation",
                title: t("homeBlockCourseTitle"),
                body: t("homeBlockCourseBody"),
              },
              {
                href: "/paths",
                title: t("homeBlockPathsTitle"),
                body: t("homeBlockPathsBody"),
              },
              {
                href: "/sadhana",
                title: t("homeBlockJapaTitle"),
                body: t("homeBlockJapaBody"),
              },
              {
                href: "/panchang",
                title: t("homeBlockPanchangTitle"),
                body: t("homeBlockPanchangBody"),
              },
            ] as const
          ).map((block) => (
            <Link
              key={block.href + block.title}
              href={block.href}
              className="group border border-[var(--line)] px-5 py-6 transition hover:border-[var(--brass)]/45"
            >
              <h3 className="font-display text-xl text-[var(--text)] transition group-hover:text-[var(--brass-hover)]">
                {block.title}
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                {block.body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Together — sangha, care, dāna, reminders */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--brass)]">
          {t("homeTogetherEyebrow")}
        </p>
        <h2 className="font-display text-3xl text-[var(--text)] sm:text-4xl">
          {t("homeTogetherTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-[var(--text-soft)] sm:text-base">
          {t("homeTogetherBlurb")}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
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
            ] as const
          ).map((block) => (
            <Link
              key={block.href}
              href={block.href}
              className="group border border-[var(--line)] px-5 py-6 transition hover:border-[var(--brass)]/45"
            >
              <h3 className="font-display text-xl text-[var(--text)] transition group-hover:text-[var(--brass-hover)]">
                {block.title}
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                {block.body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Verse of the day */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-6 text-xs uppercase tracking-[0.22em] text-[var(--brass)] drop-shadow-sm">
          {t("homeFeaturedEyebrow")}
        </p>
        <div className="glass relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12">
          <Image
            src="/ornaments/chapter.svg"
            alt=""
            width={140}
            height={140}
            className="pointer-events-none absolute -right-4 -top-4 opacity-[0.12]"
          />
          <p className="text-xs tracking-[0.2em] text-[var(--brass)]">
            {featured.ref}
          </p>
          <div className="mt-5 max-w-3xl space-y-2 font-display text-2xl leading-[1.7] text-[var(--text)] sm:text-3xl">
            {featured.sanskritLines.map((line, i) => (
              <p key={i}>
                {line}
                {i < featured.sanskritLines.length - 1 ? "।" : " ॥"}
              </p>
            ))}
          </div>
          <Image
            src="/ornaments/divider.svg"
            alt=""
            width={280}
            height={20}
            className="mt-6 opacity-60"
          />
          <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
            {translation}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/verse-of-the-day"
              className="inline-block bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("homeFeaturedCta")}
            </Link>
            <Link
              href={`/sloka/${featured.id}`}
              className="inline-block border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
            >
              {t("homeFeaturedDetail")}
            </Link>
          </div>
        </div>
      </section>

      {/* Mood preview */}
      <section className="border-t border-[var(--hairline)] py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="glass max-w-xl px-5 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
              {t("homeMoodsEyebrow")}
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
              {t("homeMoodsTitle")}
            </h2>
            <p className="mt-2 text-sm font-light text-[var(--text-muted)] sm:text-base">
              {t("homeMoodsBlurb")}
            </p>
          </div>
          <Link
            href="/mood"
            className="text-sm text-[var(--brass)] transition hover:text-[var(--brass-soft)]"
          >
            {t("homeMoodsAll")} →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {previewMoods.map((mood) => {
            const visual = getMoodVisual(mood);
            return (
              <Link
                key={mood.id}
                href={`/mood/${mood.id}`}
                className="surface group relative flex min-h-[96px] items-center justify-between gap-3 overflow-hidden px-5 py-5 backdrop-blur-md"
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(ellipse 80% 70% at 90% 10%, color-mix(in srgb, ${visual.accent} 22%, transparent), transparent 60%)`,
                  }}
                  aria-hidden
                />
                <span className="relative font-display text-xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                  {moodLabel(mood, lang)}
                </span>
                <span
                  className="mood-glyph relative inline-block h-8 w-8 shrink-0 opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                  style={{
                    backgroundColor: visual.accent,
                    WebkitMaskImage: `url(${visual.icon})`,
                    maskImage: `url(${visual.icon})`,
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Closing band */}
      <section className="relative mt-4 flex min-h-[240px] flex-col justify-center overflow-hidden border-t border-[var(--hairline)] py-16 sm:min-h-[280px]">
        <div className="hero-bleed pointer-events-none absolute inset-y-0 -z-10">
          <Image
            src="/images/hero.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[center_60%] opacity-55"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[var(--media-scrim)] via-[var(--media-scrim-mid)] to-[var(--media-scrim-soft)]"
            aria-hidden
          />
        </div>
        <div className="relative z-10 max-w-xl">
          <p className="font-display text-3xl text-[var(--on-media)] sm:text-4xl">
            {t("homeCloseLine")}
          </p>
          <Link
            href="/madhav"
            className="mt-6 inline-block bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            {t("homeCloseCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
