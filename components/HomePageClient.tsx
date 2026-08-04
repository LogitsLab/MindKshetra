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
 * Design v3 Home: Stitch first-viewport (brand + VOTD + cinematic paths)
 * plus the full companion lifestyle hub below — never a 4-tile stub alone.
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
      icon: "/icons/paths/explore.svg",
      eyebrow: "Explore",
    },
    {
      href: "/mood",
      title: t("homeMoodTitle"),
      blurb: t("homeMoodBlurb"),
      image: "/images/paths/mood.jpg",
      icon: "/icons/paths/mood.svg",
      eyebrow: "The spectrum",
    },
    {
      href: "/meditation",
      title: t("homeMeditationTitle"),
      blurb: t("homeMeditationBlurb"),
      image: "/images/paths/meditation.jpg",
      icon: "/icons/paths/meditation.svg",
      eyebrow: "Silent sit",
    },
    {
      href: "/madhav",
      title: t("homeMadhavTitle"),
      blurb: t("homeMadhavBlurb"),
      image: "/images/paths/madhav.jpg",
      icon: "/icons/paths/madhav.jpg",
      eyebrow: "AI companion",
    },
    {
      href: "/astrology",
      title: t("homeAstroTitle"),
      blurb: t("homeAstroBlurb"),
      image: "/images/paths/astrology.jpg",
      icon: "/icons/paths/astrology.svg",
      eyebrow: "Cosmic chart",
    },
    {
      href: "/paths",
      title: t("homeBlockPathsTitle"),
      blurb: t("homeBlockPathsBody"),
      image: "/images/paths/paths.jpg",
      icon: "/icons/paths/paths.svg",
      eyebrow: "Journeys",
    },
  ];

  /** Stitch first-viewport collage: Mood · Madhav · Practice · Astrology */
  const stitchPaths = [
    { ...entries[1], className: "md:row-span-2 min-h-[320px] md:min-h-0" },
    { ...entries[3], className: "md:col-span-2 min-h-[200px]" },
    { ...entries[2], className: "min-h-[200px]" },
    { ...entries[4], className: "min-h-[200px]" },
  ];

  const morePaths = [entries[0], entries[5]];

  const translation = lang === "hi" ? featured.hindi : featured.english;

  return (
    <div className="relative pb-8">
      {/* ── First viewport: brand + VOTD (Stitch) ── */}
      <section className="relative flex min-h-[min(690px,calc(100dvh-6rem))] flex-col items-center justify-center px-4 py-16 text-center sm:py-20">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--teal-glow)]/[.08] blur-[120px]"
          aria-hidden
        />
        <Image
          src="/brand/mark.svg"
          alt=""
          width={72}
          height={72}
          className="animate-rise opacity-90"
          priority
        />
        <h1 className="animate-rise-delay-1 mt-5 font-display text-5xl font-medium tracking-tight text-[var(--brass-soft)] sm:text-7xl">
          MindKshetra
        </h1>
        <p className="animate-rise-delay-2 mt-4 max-w-2xl text-base font-light leading-relaxed text-[var(--text-soft)] sm:text-lg">
          {t("homeBody")}
        </p>

        <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          {sadhanaDone === false || !continueSlokaId ? (
            <Link
              href="/sadhana"
              className="min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("homeCtaPractice")}
            </Link>
          ) : (
            <Link
              href={`/sloka/${continueSlokaId}`}
              className="min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("continueReading")}
            </Link>
          )}
          <Link
            href="/madhav"
            className="min-h-11 border border-[var(--line)] px-6 py-3 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]/55 hover:bg-[var(--brass)]/[.07]"
          >
            {t("homeCtaMadhav")}
          </Link>
          <Link
            href="/explore"
            className="min-h-11 px-2 py-3 text-sm text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
          >
            {t("homeCtaExplore")}
          </Link>
        </div>

        <div className="glass animate-rise-delay-3 relative mt-14 w-full max-w-3xl overflow-hidden px-6 py-9 sm:px-12">
          <div
            className="absolute right-0 top-0 h-20 w-20 border-r border-t border-[var(--brass)]/30"
            aria-hidden
          />
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--brass-soft)]">
            {t("homeFeaturedEyebrow")}
          </p>
          <div className="mt-5 space-y-1 font-devanagari text-xl leading-[1.8] text-[var(--brass-soft)] sm:text-2xl">
            {featured.sanskritLines.map((line, index) => (
              <p key={line}>
                {line}
                {index === featured.sanskritLines.length - 1 ? " ॥" : " ।"}
              </p>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-2xl font-display text-base italic leading-relaxed text-[var(--text-soft)] sm:text-lg">
            “{translation}”
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-xs">
            <span className="text-[var(--text-muted)]">{featured.ref}</span>
            <span className="hidden h-px w-10 bg-[var(--brass)]/35 sm:block" />
            <Link
              href={`/sloka/${featured.id}`}
              className="uppercase tracking-[0.16em] text-[var(--brass-soft)] hover:underline"
            >
              {t("homeFeaturedDetail")}
            </Link>
            <Link
              href="/verse-of-the-day"
              className="uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-[var(--brass-soft)] hover:underline"
            >
              {t("homeFeaturedCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stitch path collage (4 cinematic tiles) ── */}
      <section className="grid gap-4 md:grid-cols-3 md:grid-rows-2 md:min-h-[640px]">
        {stitchPaths.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className={`group relative overflow-hidden border border-[var(--line)] transition hover:border-[var(--brass)]/45 ${entry.className}`}
          >
            <Image
              src={entry.image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover opacity-55 transition duration-700 group-hover:scale-105 group-hover:opacity-70"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[var(--void)] via-[rgba(7,9,15,.38)] to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
                {entry.eyebrow}
              </p>
              <h2 className="mt-2 font-display text-3xl text-white">
                {entry.title}
              </h2>
              <p className="mt-2 max-w-md text-sm font-light leading-relaxed text-white/65">
                {entry.blurb}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {/* ── More paths: Explore + Paths (completeness) ── */}
      <section className="border-t border-[var(--hairline)] py-14">
        <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--brass)]">
          {t("homePaths")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {morePaths.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden border border-[var(--line)] transition hover:border-[var(--brass)]/45"
            >
              <Image
                src={entry.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover opacity-50 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-65"
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
                <p className="mt-2 text-sm font-light text-white/65">
                  {entry.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Practice lifestyle: Sadhana, meditation, Course/Japa/Panchang ── */}
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
              <p
                className="mt-4 text-xs tracking-[0.12em] text-[var(--brass-soft)]"
                title={t("streakLabel")}
              >
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
              {medDoneCount === 0
                ? t("medHomeStart")
                : t("medHomeContinue").replace(
                    "{n}",
                    String(Math.min(45, Math.max(1, medContinueDay)))
                  )}
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
        <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-3">
          {previewMoods.map((mood) => {
            const visual = getMoodVisual(mood);
            return (
              <Link
                key={mood.id}
                href={`/mood/${mood.id}`}
                className="surface group relative flex min-h-[52px] flex-1 items-center justify-between gap-3 overflow-hidden px-4 py-3 backdrop-blur-md sm:min-h-[96px] sm:px-5 sm:py-5"
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(ellipse 80% 70% at 90% 10%, color-mix(in srgb, ${visual.accent} 22%, transparent), transparent 60%)`,
                  }}
                  aria-hidden
                />
                <span className="relative font-display text-lg text-[var(--text)] transition group-hover:text-[var(--brass-soft)] sm:text-xl">
                  {moodLabel(mood, lang)}
                </span>
                <span
                  className="mood-glyph relative hidden h-8 w-8 shrink-0 opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-100 sm:inline-block"
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
          src="/images/hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_60%] opacity-45"
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
