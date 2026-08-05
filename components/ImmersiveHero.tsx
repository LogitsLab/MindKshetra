"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Shared field hero for lifestyle surfaces (sādhana, panchang, community…).
 * Matches the meditation / paths hub language: tall image, scrim, brass CTAs.
 */
export default function ImmersiveHero({
  image,
  eyebrow,
  title,
  intro,
  meta,
  actions,
  children,
  compact,
}: {
  image: string;
  eyebrow: string;
  title: string;
  intro?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Slightly shorter — for quiet pages like Care. */
  compact?: boolean;
}) {
  return (
    <section className="med-hub__hero relative mb-12 overflow-hidden border border-[var(--line)]">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 80rem"
        className="object-cover object-center"
      />
      <div className="med-hub__hero-scrim absolute inset-0" aria-hidden />
      <div
        className={`relative z-10 flex flex-col justify-end px-6 py-8 sm:px-10 sm:py-10 lg:px-12 ${
          compact
            ? "min-h-[18rem] sm:min-h-[20rem]"
            : "min-h-[22rem] sm:min-h-[26rem]"
        }`}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-xl font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-white">
          {title}
        </h1>
        {intro ? (
          <p className="mt-3 max-w-lg text-sm font-light leading-relaxed text-white/75 sm:text-base">
            {intro}
          </p>
        ) : null}
        {meta ? <div className="mt-6 max-w-md">{meta}</div> : null}
        {actions ? (
          <div className="mt-8 flex flex-wrap items-end gap-4">{actions}</div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
