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

/**
 * Option A — Atmosphere Sit:
 * Full-bleed meditation hero + slim VOTD + 6 equal path tiles (incl. Explore).
 * Full companion lifestyle hub retained below.
 */
export default function HomePageClient({ featured, previewMoods }: Props) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const { continueSlokaId } = useProgress();
  const [sadhanaDone, setSadhanaDone] = useState<boolean | null>(null);
  const [practiceStreak, setPracticeStreak] = useState(0);
  const [medContinueDay, setMedContinueDay] = useState<number | null>(null);
  const [medDoneCount, setMedDoneCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meditation/progress?program=sitting-course")
      .then((r) => (r.ok ? r.json() : null))
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
            setMedDoneCount(days.length);
            setMedContinueDay(days.length ? Math.max(...days) + 1 : 1);
          } catch {
            setMedContinueDay(1);
            setMedDoneCount(0);
          }
          return;
        }
        setMedDoneCount(
          (data.completedDays as number[] | undefined)?.length ?? 0
        );
        setMedContinueDay(Number(data.currentDay) || 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSadhanaDone(null);
      setPracticeStreak(0);
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
          const flow = (data.streaks ?? []).find(
            (x: { practice?: string }) => x.practice === "flow"
          );
          setPracticeStreak(Number(flow?.current) || 0);
        }
      })
      .catch(() => {});
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
      title: t("homeBlockPathsTitle"),
      blurb: t("homeBlockPathsBody"),
      image: "/images/paths/paths.jpg",
      eyebrow: "Journeys",
    },
  ];

  const translation = lang === "hi" ? featured.hindi : featured.english;
  const sitHref =
    medContinueDay != null
      ? `/meditation/${Math.min(45, Math.max(1, medContinueDay))}`
      : "/meditation";
  const sitLabel =
    medDoneCount === 0
      ? t("medHomeStart")
      : t("medHomeContinue").replace(
          "{n}",
          String(Math.min(45, Math.max(1, medContinueDay ?? 1)))
        );

  return (
    <div className="relative pb-8">
      {/* ── Atmosphere Sit hero ── */}
      <section className="hero-bleed relative flex min-h-[calc(100dvh-4.5rem)] flex-col justify-end overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <Image
            src="/images/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-ken object-cover object-[center_42%] opacity-70"
          />
          <div className="hero-breath absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(61,122,106,0.18),transparent_58%)]" />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[var(--void)] via-[rgba(7,9,15,.55)] to-[rgba(7,9,15,.35)]"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[rgba(7,9,15,.55)] via-transparent to-[rgba(7,9,15,.25)]"
            aria-hidden
          />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-6 pt-16 sm:px-6 sm:pb-8 sm:pt-20">
          <div className="max-w-2xl">
            <Image
              src="/brand/mark.svg"
              alt=""
              width={48}
              height={48}
              className="animate-rise opacity-95"
              priority
            />
            <h1 className="animate-rise-delay-1 mt-5 font-display text-5xl font-medium leading-[0.95] tracking-tight text-[var(--brass-soft)] sm:text-7xl md:text-8xl">
              MindKshetra
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-xl font-display text-lg leading-snug text-white/90 sm:text-2xl">
              {t("homeTagline")}
            </p>
            <p className="animate-rise-delay-3 mt-3 max-w-lg text-sm font-light leading-relaxed text-white/70 sm:text-base">
              {t("homeBody")}
            </p>

            <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={sitHref}
                className="min-h-12 bg-[var(--brass)] px-7 py-3.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {sitLabel}
              </Link>
              <Link
                href="/madhav"
                className="min-h-12 border border-white/30 bg-white/5 px-6 py-3.5 text-sm text-white backdrop-blur-sm transition hover:border-[var(--brass)]/55 hover:bg-white/10"
              >
                {t("homeCtaMadhav")}
              </Link>
              {sadhanaDone === false ? (
                <Link
                  href="/sadhana"
                  className="min-h-12 px-2 py-3.5 text-sm text-white/75 underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
                >
                  {t("homeCtaPractice")}
                </Link>
              ) : continueSlokaId ? (
                <Link
                  href={`/sloka/${continueSlokaId}`}
                  className="min-h-12 px-2 py-3.5 text-sm text-white/75 underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
                >
                  {t("continueReading")}
                </Link>
              ) : (
                <Link
                  href="/explore"
                  className="min-h-12 px-2 py-3.5 text-sm text-white/75 underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
                >
                  {t("homeCtaExplore")}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Slim VOTD strip — not a bulky centered card */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="glass flex flex-col gap-4 overflow-hidden border-[var(--line)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:px-7 sm:py-6">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--brass-soft)]">
                {t("homeFeaturedEyebrow")} · {featured.ref}
              </p>
              <p className="mt-2 truncate font-devanagari text-lg text-[var(--brass-soft)] sm:text-xl">
                {featured.sanskritLines[0]}
                {featured.sanskritLines.length > 1 ? " …" : " ॥"}
              </p>
              <p className="mt-2 line-clamp-2 max-w-2xl font-display text-sm italic leading-relaxed text-[var(--text-soft)] sm:text-base">
                “{translation}”
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href={`/sloka/${featured.id}`}
                className="text-xs uppercase tracking-[0.16em] text-[var(--brass-soft)] hover:underline"
              >
                {t("homeFeaturedDetail")}
              </Link>
              <Link
                href="/verse-of-the-day"
                className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-[var(--brass-soft)] hover:underline"
              >
                {t("homeFeaturedCta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Six equal path tiles (Explore included) ── */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--brass)]">
          {t("homePaths")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden border border-[var(--line)] transition hover:border-[var(--brass)]/45 sm:min-h-[260px]"
            >
              <Image
                src={entry.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover opacity-55 transition duration-700 group-hover:scale-105 group-hover:opacity-70"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[var(--void)] via-[rgba(7,9,15,.4)] to-transparent"
                aria-hidden
              />
              <div className="relative z-10 p-6 sm:p-7">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
                  {entry.eyebrow}
                </p>
                <h2 className="mt-2 font-display text-2xl text-white sm:text-3xl">
                  {entry.title}
                </h2>
                <p className="mt-2 text-sm font-light leading-relaxed text-white/65">
                  {entry.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Practice lifestyle ── */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--brass)]">
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
          className="glass group mt-8 block overflow-hidden transition hover:border-[var(--brass)]/40"
        >
          <div className="border-l-2 border-[var(--brass)]/70 px-6 py-8 sm:px-8 sm:py-9">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass)]">
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
              {sadhanaDone === true
                ? t("sadhanaDoneToday")
                : t("sadhanaHomeBody")}
            </p>
            {practiceStreak > 0 ? (
              <p className="mt-4 text-xs tracking-[0.12em] text-[var(--brass-soft)]">
                {t("sadhanaStreakLine").replace(
                  "{n}",
                  String(practiceStreak)
                )}
              </p>
            ) : null}
          </div>
        </Link>

        {medContinueDay != null ? (
          <Link
            href={`/meditation/${Math.min(45, Math.max(1, medContinueDay))}`}
            className="glass mt-4 block px-6 py-5 transition hover:border-[var(--brass)]/40"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass)]">
              {t("medEyebrow")}
            </p>
            <p className="mt-2 font-display text-xl text-[var(--text)]">
              {sitLabel}
            </p>
          </Link>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              {
                href: "/meditation",
                title: t("homeBlockCourseTitle"),
                body: t("homeBlockCourseBody"),
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
            ] as const
          ).map((block) => (
            <Link
              key={block.href + block.title}
              href={block.href}
              className="group relative flex min-h-[160px] flex-col justify-end overflow-hidden border border-[var(--line)] transition hover:border-[var(--brass)]/45"
            >
              <Image
                src={block.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover opacity-45 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-60"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[var(--media-scrim)] via-[var(--media-scrim-mid)] to-transparent"
                aria-hidden
              />
              <div className="relative z-10 px-5 py-5">
                <h3 className="font-display text-xl text-[var(--on-media)] transition group-hover:text-[var(--brass-hover)]">
                  {block.title}
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-[var(--on-media-muted)]">
                  {block.body}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Together ── */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--brass)]">
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
              className="group border border-[var(--line)] bg-[var(--panel)] px-5 py-6 backdrop-blur-sm transition hover:border-[var(--brass)]/45"
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

      {/* ── Mood preview ── */}
      <section className="border-t border-[var(--hairline)] py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
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

      {/* ── Closing Madhav band ── */}
      <section className="relative mt-4 flex min-h-[260px] flex-col items-center justify-center overflow-hidden border border-[var(--line)] py-16 text-center sm:min-h-[300px]">
        <Image
          src="/images/paths/madhav.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-40"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[rgba(7,9,15,.55)] via-[rgba(7,9,15,.72)] to-[var(--void)]"
          aria-hidden
        />
        <div className="relative z-10 max-w-xl px-6">
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
