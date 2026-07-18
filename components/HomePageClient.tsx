"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { moodLabel } from "@/lib/moods";
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
      href: "/madhav",
      title: t("homeMadhavTitle"),
      blurb: t("homeMadhavBlurb"),
      image: "/images/paths/madhav.jpg",
      icon: "/icons/paths/madhav.svg",
    },
  ];

  const translation = lang === "hi" ? featured.hindi : featured.english;

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-8rem)] flex-col justify-center py-10 sm:py-16">
        {/* Scrim only — site-atmosphere already carries the hero image */}
        <div className="hero-bleed pointer-events-none absolute inset-y-0 -z-10">
          <div
            className="absolute inset-0 bg-gradient-to-r from-[rgba(7,9,15,0.55)] via-[rgba(7,9,15,0.28)] to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[var(--void)] via-transparent to-[rgba(7,9,15,0.2)]"
            aria-hidden
          />
        </div>

        <p
          className="watermark-sanskrit pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[18vw] leading-none text-white/[0.03] sm:text-[9rem]"
          aria-hidden
        >
          मनः
        </p>

        <div className="relative z-10 max-w-3xl">
          <p className="animate-rise mb-4 font-body text-xs uppercase tracking-[0.28em] text-[var(--brass-soft)] sm:text-sm">
            {t("homeEyebrow")}
          </p>
          <h1 className="animate-rise-delay-1 font-display text-6xl font-semibold leading-[0.95] tracking-tight text-[var(--text)] sm:text-7xl md:text-8xl">
            MindKshetra
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-xl font-display text-xl leading-snug text-[var(--brass-soft)] sm:text-2xl md:text-3xl">
            {t("homeTagline")}
          </p>
          <p className="animate-rise-delay-3 mt-6 max-w-lg text-base font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
            {t("homeBody")}
          </p>

          <div className="animate-rise-delay-3 mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/madhav"
              className="bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--void)] transition hover:bg-[var(--brass-soft)]"
            >
              {t("homeCtaMadhav")}
            </Link>
            <Link
              href="/explore"
              className="border border-[var(--line)] px-6 py-3 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
            >
              {t("homeCtaExplore")}
            </Link>
          </div>
        </div>
      </section>

      {/* Paths with images */}
      <section className="border-t border-white/[0.06] py-14">
        <p className="mb-8 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {t("homePaths")}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
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
                className="object-cover opacity-50 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-65"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[var(--void)] via-[rgba(7,9,15,0.72)] to-[rgba(7,9,15,0.25)]"
                aria-hidden
              />
              <div className="relative z-10 p-6 sm:p-7">
                <Image
                  src={entry.icon}
                  alt=""
                  width={40}
                  height={40}
                  className="path-mark mb-3 opacity-85 transition duration-300 group-hover:-translate-y-0.5 group-hover:opacity-100"
                />
                <span className="font-body text-xs text-[var(--brass)]">
                  0{i + 1}
                </span>
                <h2 className="mt-2 font-display text-3xl text-[var(--text)] transition group-hover:text-[var(--brass-soft)]">
                  <span className="link-underline">{entry.title}</span>
                </h2>
                <p className="mt-2 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                  {entry.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured verse */}
      <section className="border-t border-white/[0.06] py-14">
        <p className="mb-6 text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {t("homeFeaturedEyebrow")}
        </p>
        <div className="relative overflow-hidden border border-[var(--line)] bg-[rgba(14,20,32,0.55)] px-6 py-10 sm:px-10 sm:py-12">
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
          <Link
            href={`/sloka/${featured.id}`}
            className="mt-8 inline-block bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--void)] transition hover:bg-[var(--brass-soft)]"
          >
            {t("homeFeaturedCta")}
          </Link>
        </div>
      </section>

      {/* Mood preview */}
      <section className="border-t border-white/[0.06] py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
              {t("homeMoodsEyebrow")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
              {t("homeMoodsTitle")}
            </h2>
            <p className="mt-2 text-sm font-light text-[var(--text-muted)] sm:text-base">
              {t("homeMoodsBlurb")}
            </p>
          </div>
          <Link
            href="/mood"
            className="text-sm text-[var(--brass-soft)] transition hover:text-[var(--brass)]"
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
                className="surface group relative flex min-h-[96px] items-center justify-between gap-3 overflow-hidden px-5 py-5"
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
      <section className="relative mt-4 flex min-h-[240px] flex-col justify-center overflow-hidden border-t border-white/[0.06] py-16 sm:min-h-[280px]">
        <div className="hero-bleed pointer-events-none absolute inset-y-0 -z-10">
          <Image
            src="/images/hero.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[center_60%] opacity-40"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[var(--void)] via-[rgba(7,9,15,0.85)] to-[rgba(7,9,15,0.55)]"
            aria-hidden
          />
        </div>
        <div className="relative z-10 max-w-xl">
          <p className="font-display text-3xl text-[var(--text)] sm:text-4xl">
            {t("homeCloseLine")}
          </p>
          <Link
            href="/madhav"
            className="mt-6 inline-block bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--void)] transition hover:bg-[var(--brass-soft)]"
          >
            {t("homeCloseCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
