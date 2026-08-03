"use client";

import Link from "next/link";

export default function TransitsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/astrology" className="text-sm text-[var(--text-muted)]">
        ← Astrology
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        Planetary transits
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Transit hits and emphasis are computed against a natal chart. Open a
        member or incognito chart — the Chart hub already surfaces current
        transit context from Swiss Ephemeris.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/astrology/incognito"
          className="rounded-md border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-3 text-sm text-[var(--brass-soft)]"
        >
          Cast incognito chart
        </Link>
        <Link
          href="/astrology/members"
          className="rounded-md border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-soft)]"
        >
          Saved members
        </Link>
      </div>
      <p className="mt-8 text-xs text-[var(--text-muted)]">
        Ephemeris is the source of truth. LLM copy only narrates fact packs.
      </p>
    </main>
  );
}
