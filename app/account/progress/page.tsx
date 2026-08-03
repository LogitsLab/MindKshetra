"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import AccountJourneyShell from "@/components/AccountJourneyShell";

type Range = "daily" | "weekly" | "monthly" | "yearly";

type Summary = {
  sessions: number;
  durationMinutes: number;
  mantras: number;
  visitStreak: { current: number; longest: number };
  distribution: {
    meditation: number;
    japa: number;
    reading: number;
    other: number;
  };
  seeker?: { labelEn: string; labelHi: string; level: number };
};

export default function ProgressPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  const [range, setRange] = useState<Range>("monthly");
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    if (!user || user.is_anonymous) return;
    void fetch(`/api/account/progress-summary?range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [user, range]);

  const distribution = data?.distribution ?? {
    meditation: 0,
    japa: 0,
    reading: 0,
    other: 0,
  };

  return (
    <AccountJourneyShell>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-8">
        <div>
          <p className="eyebrow text-[var(--brass-soft)]">Sanctuary of self</p>
          <h1 className="mt-3 font-display text-4xl text-[var(--text)] sm:text-5xl">
            {L === "hi" ? "प्रगति" : "Private Seeker"}
          </h1>
          <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-[var(--text-soft)]">
            Private recognition — no leaderboards. Only your practice witnesses this progress.
          </p>
        </div>
        <div className="rounded-full border border-[var(--brass)]/45 bg-[var(--brass)]/[.08] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--brass-soft)]">
          Level {data?.seeker?.level ?? 1}
        </div>
      </header>

      {!user || user.is_anonymous ? (
        <p className="mt-8 text-[var(--text-soft)]">
          Sign in to view progress. <Link href="/account" className="text-[var(--brass-soft)]">Account</Link>
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly", "yearly"] as Range[]).map((item) => (
              <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-widest ${range === item ? "border-[var(--brass)] text-[var(--brass-soft)]" : "border-[var(--hairline)] text-[var(--text-muted)]"}`}>
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-12">
            <section className="glass rounded-xl p-6 sm:p-8 xl:col-span-5">
              <div className="flex items-center gap-7">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 border-[var(--brass)]/25">
                  <div className="absolute inset-[-4px] rounded-full border-4 border-transparent border-t-[var(--brass)] border-r-[var(--brass)]" />
                  <div className="text-center">
                    <p className="font-display text-4xl">{data?.visitStreak.current ?? 0}</p>
                    <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Days</p>
                  </div>
                </div>
                <div>
                  <h2 className="font-display text-2xl">Consistency streak</h2>
                  <p className="mt-2 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                    Longest return: {data?.visitStreak.longest ?? 0} days.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass rounded-xl p-6 sm:p-8 xl:col-span-7">
              <p className="eyebrow text-[var(--brass-soft)]">Practice distribution</p>
              <div className="mt-7 space-y-5">
                {Object.entries(distribution).map(([name, value]) => (
                  <div key={name}>
                    <div className="mb-2 flex justify-between text-xs uppercase tracking-wider">
                      <span className="text-[var(--text-soft)]">{name}</span>
                      <span className="text-[var(--brass-soft)]">{value}%</span>
                    </div>
                    <div className="h-1 bg-[var(--hairline)]">
                      <div className="h-full bg-[var(--brass)]" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="glass mt-5 grid grid-cols-3 divide-x divide-[var(--hairline)] rounded-xl py-8">
            {[
              [data?.sessions ?? 0, L === "hi" ? "सत्र" : "Sessions"],
              [data?.durationMinutes ?? 0, L === "hi" ? "मिनट" : "Minutes"],
              [data?.mantras ?? 0, L === "hi" ? "मंत्र" : "Mantras"],
            ].map(([value, label]) => (
              <div key={String(label)} className="text-center">
                <p className="font-display text-2xl text-[var(--brass-soft)] sm:text-4xl">{value}</p>
                <p className="mt-2 text-[9px] uppercase tracking-widest text-[var(--text-muted)] sm:text-[10px]">{label}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </AccountJourneyShell>
  );

  const legacyData = data!;
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account" className="text-sm text-[var(--text-muted)]">
        ← Account
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        {L === "hi" ? "प्रगति" : "Progress"}
      </h1>
      {!user || user?.is_anonymous ? (
        <p className="mt-4 text-[var(--text-soft)]">
          Sign in to view progress.{" "}
          <Link href="/account" className="text-[var(--brass)]">
            Account
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly", "yearly"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded border px-3 py-1.5 text-xs uppercase tracking-wide ${
                  range === r
                    ? "border-[var(--brass)] text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {data ? (
            <div className="mt-8 space-y-4">
              {legacyData.seeker ? (
                <p className="text-[var(--text-soft)]">
                  {L === "hi" ? legacyData.seeker!.labelHi : legacyData.seeker!.labelEn} ·
                  Level {legacyData.seeker!.level}
                </p>
              ) : null}
              <div className="grid grid-cols-3 gap-3">
                {[
                  [L === "hi" ? "सत्र" : "Sessions", legacyData.sessions],
                  [L === "hi" ? "मिनट" : "Minutes", legacyData.durationMinutes],
                  [L === "hi" ? "मंत्र" : "Mantras", legacyData.mantras],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 text-center"
                  >
                    <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--brass)]">
                      {value}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="eyebrow text-[var(--brass)]">Streak</p>
                <p className="mt-2 text-[var(--text)]">
                  {legacyData.visitStreak.current} current · {legacyData.visitStreak.longest}{" "}
                  longest
                </p>
              </div>
              <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="eyebrow text-[var(--brass)]">Distribution</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
                  {Object.entries(legacyData.distribution).map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span>{v}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-[var(--text-muted)]">Loading…</p>
          )}
        </>
      )}
    </main>
  );
}
