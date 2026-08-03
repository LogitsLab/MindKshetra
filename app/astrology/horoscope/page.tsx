"use client";

import Link from "next/link";

/**
 * Horoscope insights — lifestyle UI shell.
 * Predictions remain chart-fact-based via existing ChartHub predictions;
 * this page routes users toward a saved chart or panchang context.
 */
export default function HoroscopePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/astrology" className="text-sm text-[var(--text-muted)]">
        ← Astrology
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        Horoscope insights
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Daily / weekly / monthly guidance is narrated from your chart facts —
        never invented placements. Cast or open a chart to read life-area
        insights.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/astrology"
          className="rounded-md border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-3 text-sm text-[var(--brass-soft)]"
        >
          Open Astrology hub
        </Link>
        <Link
          href="/astrology/members"
          className="rounded-md border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-soft)]"
        >
          Saved members
        </Link>
        <Link
          href="/panchang"
          className="rounded-md border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-soft)]"
        >
          Today&apos;s Panchang
        </Link>
      </div>
      <p className="mt-8 text-xs text-[var(--text-muted)]">
        Informational only — not medical or financial advice. Lifestyle
        expansion behind accuracy review (`ASTROLOGY_LIFESTYLE_ENABLED`).
      </p>
    </main>
  );
}
