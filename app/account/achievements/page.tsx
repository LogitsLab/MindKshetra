"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import AccountJourneyShell from "@/components/AccountJourneyShell";

type AchievementsPayload = {
  seeker: { labelEn: string; labelHi: string; level: number };
  achievements: Array<{
    id: string;
    nameEn: string;
    nameHi: string;
    lineEn: string;
    lineHi: string;
    progress: number;
    target: number;
    unlocked: boolean;
  }>;
};

type LifetimeStats = {
  sessions: number;
  durationMinutes: number;
  mantras: number;
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  const [data, setData] = useState<AchievementsPayload | null>(null);
  const [lifetime, setLifetime] = useState<LifetimeStats | null>(null);

  useEffect(() => {
    if (!user || user.is_anonymous) return;
    void fetch("/api/account/achievements")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
    void fetch("/api/account/progress-summary?range=yearly")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setLifetime({
          sessions: Number(d.sessions) || 0,
          durationMinutes: Number(d.durationMinutes) || 0,
          mantras: Number(d.mantras) || 0,
        });
      })
      .catch(() => setLifetime(null));
  }, [user]);

  return (
    <AccountJourneyShell>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-8">
        <div>
          <p className="eyebrow text-[var(--brass-soft)]">Sacred achievements</p>
          <h1 className="mt-3 font-display text-4xl text-[var(--brass-soft)] sm:text-5xl">
            {data
              ? `${L === "hi" ? data.seeker.labelHi : data.seeker.labelEn} · Level ${data.seeker.level}`
              : L === "hi" ? "उपलब्धियाँ" : "Private Seeker"}
          </h1>
          <p className="mt-3 max-w-xl font-light leading-relaxed text-[var(--text-soft)]">
            Private recognition — no leaderboards. Only your soul witnesses this progress.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-[.18em] text-[var(--brass-soft)]">Grace days active</p>
      </header>

      {!user || user.is_anonymous ? (
        <p className="mt-8 text-[var(--text-soft)]">
          Sign in to sync achievements. <Link href="/account" className="text-[var(--brass-soft)]">Account</Link>
        </p>
      ) : data ? (
        <>
          <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.achievements.map((achievement, index) => {
              const percent = Math.min(100, (achievement.progress / achievement.target) * 100);
              return (
                <li
                  key={achievement.id}
                  className={`glass rounded-xl p-7 text-center transition hover:-translate-y-1 ${
                    achievement.unlocked ? "" : "opacity-55 grayscale"
                  }`}
                >
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--brass)]/[.05] text-5xl text-[var(--brass-soft)]">
                    {achievement.unlocked ? ["✦", "◉", "◇"][index % 3] : "⌾"}
                  </div>
                  <h2 className="mt-5 font-display text-2xl text-[var(--text)]">
                    {L === "hi" ? achievement.nameHi : achievement.nameEn}
                  </h2>
                  <p className="mt-2 min-h-10 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                    {L === "hi" ? achievement.lineHi : achievement.lineEn}
                  </p>
                  <div className="mt-6 flex justify-between text-[9px] uppercase tracking-wider">
                    <span className="text-[var(--text-muted)]">{achievement.unlocked ? "Milestone reached" : "Current path"}</span>
                    <span className="text-[var(--brass-soft)]">{achievement.progress}/{achievement.target}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--hairline)]">
                    <div className="h-full bg-[var(--brass)]" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <section className="glass mt-8 grid grid-cols-3 divide-x divide-[var(--hairline)] py-8">
            {(
              [
                [lifetime?.sessions ?? 0, L === "hi" ? "सत्र" : "Sessions"],
                [
                  lifetime?.durationMinutes ?? 0,
                  L === "hi" ? "मिनट" : "Mindful minutes",
                ],
                [lifetime?.mantras ?? 0, L === "hi" ? "माला" : "Malas"],
              ] as const
            ).map(([value, label]) => (
              <div key={label} className="px-3 py-5 text-center">
                <p className="font-display text-3xl text-[var(--brass-soft)]">
                  {Number(value).toLocaleString()}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
                  {label}
                </p>
              </div>
            ))}
          </section>
        </>
      ) : (
        <p className="mt-8 text-[var(--text-muted)]">Loading…</p>
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
        {L === "hi" ? "उपलब्धियाँ" : "Achievements"}
      </h1>
      {!user || user?.is_anonymous ? (
        <p className="mt-4 text-[var(--text-soft)]">
          Sign in to sync achievements.{" "}
          <Link href="/account" className="text-[var(--brass)]">
            Account
          </Link>
        </p>
      ) : data ? (
        <>
          <p className="mt-2 text-[var(--text-soft)]">
            {L === "hi" ? legacyData.seeker.labelHi : legacyData.seeker.labelEn} · Level{" "}
            {legacyData.seeker.level}
          </p>
          <ul className="mt-8 space-y-3">
            {legacyData.achievements.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-[var(--text)]">
                      {L === "hi" ? a.nameHi : a.nameEn}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {L === "hi" ? a.lineHi : a.lineEn}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {a.progress}/{a.target}
                  </p>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded bg-[var(--hairline)]">
                  <div
                    className="h-full bg-[var(--brass)]"
                    style={{
                      width: `${Math.min(100, (a.progress / a.target) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-[var(--text-muted)]">Loading…</p>
      )}
    </main>
  );
}
