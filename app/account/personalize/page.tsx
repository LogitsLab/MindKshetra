"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import AccountJourneyShell from "@/components/AccountJourneyShell";
import {
  DAILY_TIME_OPTIONS,
  GOALS,
  GUIDANCE_STYLES,
  INSPIRATIONS,
  ONBOARDING_COPY,
  ONBOARDING_VERSION,
  type GoalId,
  type GuidanceStyleId,
  type InspirationId,
} from "@/lib/personalization";

const DRAFT_KEY = "mindkshetra-personalization-draft";

export default function PersonalizePage() {
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const L = lang === "hi" ? "hi" : "en";
  const copy = ONBOARDING_COPY;

  const [goals, setGoals] = useState<GoalId[]>([]);
  const [inspirations, setInspirations] = useState<InspirationId[]>([]);
  const [dailyTimeMinutes, setDailyTimeMinutes] = useState<number>(10);
  const [guidanceStyle, setGuidanceStyle] =
    useState<GuidanceStyleId>("balanced");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const tile = useMemo(
    () =>
      "rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-left text-sm text-[var(--text)] transition hover:border-[var(--brass)]/50",
    []
  );

  function toggleGoal(id: GoalId) {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  function toggleInspiration(id: InspirationId) {
    setInspirations((g) =>
      g.includes(id) ? g.filter((x) => x !== id) : [...g, id]
    );
  }

  async function save(skipped = false) {
    setStatus("saving");
    setError(null);
    const payload = {
      goals,
      inspirations,
      dailyTimeMinutes,
      guidanceStyle,
      displayName,
      preferredLanguage: lang,
      skipped,
      onboardingVersion: ONBOARDING_VERSION,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }

    if (user) {
      const res = await fetch("/api/account/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not save");
        setStatus("error");
        return;
      }
    }

    setStatus("saved");
    router.push("/account");
  }

  return (
    <AccountJourneyShell>
      <header className="mb-9">
        <p className="eyebrow text-[var(--brass-soft)]">Sanctuary of self</p>
        <h1 className="mt-3 font-display text-4xl text-[var(--text)] sm:text-5xl">
          Personalization
        </h1>
        <p className="mt-3 max-w-2xl font-light leading-relaxed text-[var(--text-soft)]">
          Refine your practice around the attention, language, and rhythm that serve you now.
        </p>
      </header>
      <section className="glass rounded-xl p-5 sm:p-8">
        <div className="grid gap-6 border-b border-[var(--line)] pb-8 sm:grid-cols-2">
          <label className="text-[10px] font-medium uppercase tracking-[.16em] text-[var(--brass-soft)]">
            Seeker name
            <input
              className="mt-3 w-full border-0 border-b border-[var(--brass)]/35 bg-transparent px-0 py-2 text-base normal-case tracking-normal text-[var(--text)] outline-none"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={copy.setup.namePlaceholder[L]}
            />
          </label>
          <label className="text-[10px] font-medium uppercase tracking-[.16em] text-[var(--brass-soft)]">
            Preferred script
            <select
              className="mt-3 w-full border border-[var(--line)] bg-[var(--void)] px-3 py-2.5 text-sm normal-case tracking-normal text-[var(--text)]"
              value={lang}
              onChange={(e) => setLang(e.target.value === "hi" ? "hi" : "en")}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </label>
        </div>

        <div className="mt-8">
          <h2 className="eyebrow text-[var(--brass-soft)]">Focus of the soul</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={`rounded border px-3 py-3 text-sm transition ${
                  goals.includes(goal.id)
                    ? "border-[var(--brass)] bg-[var(--brass)]/[.09] text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-soft)] hover:bg-white/[.03]"
                }`}
              >
                {goal[L]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="eyebrow text-[var(--brass-soft)]">Divine archetype focus</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {INSPIRATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInspiration(item.id)}
                className={`relative min-h-28 overflow-hidden rounded-lg border p-4 font-display text-lg transition ${
                  inspirations.includes(item.id)
                    ? "border-[var(--brass)] bg-[var(--brass)]/[.1] text-[var(--brass-soft)]"
                    : "border-[var(--line)] bg-white/[.025] text-[var(--text-soft)]"
                }`}
              >
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(201,162,39,.15),transparent_65%)]" />
                <span className="relative">{item[L]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 border-t border-[var(--hairline)] pt-8 sm:grid-cols-2">
          <div>
            <h2 className="eyebrow text-[var(--brass-soft)]">Guidance style</h2>
            <div className="mt-4 space-y-2">
              {GUIDANCE_STYLES.map((style) => (
                <button key={style.id} type="button" onClick={() => setGuidanceStyle(style.id)} className={`block w-full rounded border px-4 py-2.5 text-left text-sm ${guidanceStyle === style.id ? "border-[var(--brass)] text-[var(--brass-soft)]" : "border-[var(--hairline)] text-[var(--text-muted)]"}`}>
                  {style[L]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="eyebrow text-[var(--brass-soft)]">Daily commitment</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {DAILY_TIME_OPTIONS.map((time) => (
                <button key={time.minutes} type="button" onClick={() => setDailyTimeMinutes(time.minutes)} className={`rounded border px-4 py-2 text-sm ${dailyTimeMinutes === time.minutes ? "border-[var(--brass)] bg-[var(--brass)] text-[var(--on-brass)]" : "border-[var(--line)] text-[var(--text-muted)]"}`}>
                  {time.minutes}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}
        <button type="button" disabled={status === "saving"} onClick={() => void save(false)} className="mt-8 w-full rounded-lg bg-[var(--brass)] px-6 py-4 text-sm font-semibold uppercase tracking-[.18em] text-[var(--on-brass)] hover:bg-[var(--brass-soft)] disabled:opacity-50">
          {status === "saving" ? "Saving…" : "Save journey"}
        </button>
        {!user ? <p className="mt-3 text-center text-[10px] text-[var(--text-muted)]">Drafts stay on this device until sign-in.</p> : null}
      </section>
    </AccountJourneyShell>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="eyebrow text-[var(--brass)]">Personalize</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        {copy.setup.title[L]}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Optional on web — the same answers as the app onboarding, saved to your
        account when signed in.
      </p>

      <section className="mt-10">
        <h2 className="text-lg text-[var(--text)]">{copy.goals.title[L]}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${tile} ${goals.includes(g.id) ? "border-[var(--brass)]" : ""}`}
              onClick={() => toggleGoal(g.id)}
            >
              {g[L]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg text-[var(--text)]">{copy.inspirations.title[L]}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INSPIRATIONS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${tile} ${inspirations.includes(g.id) ? "border-[var(--brass)]" : ""}`}
              onClick={() => toggleInspiration(g.id)}
            >
              {g[L]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-sm text-[var(--text-muted)]"
          onClick={() => setInspirations([])}
        >
          {copy.inspirations.none[L]}
        </button>
      </section>

      <section className="mt-10">
        <h2 className="text-lg text-[var(--text)]">{copy.time.title[L]}</h2>
        <div className="mt-3 flex flex-col gap-2">
          {DAILY_TIME_OPTIONS.map((o) => (
            <button
              key={o.minutes}
              type="button"
              className={`${tile} ${dailyTimeMinutes === o.minutes ? "border-[var(--brass)]" : ""}`}
              onClick={() => setDailyTimeMinutes(o.minutes)}
            >
              {o[L]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg text-[var(--text)]">{copy.setup.guidance[L]}</h2>
        <div className="mt-3 flex flex-col gap-2">
          {GUIDANCE_STYLES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${tile} ${guidanceStyle === g.id ? "border-[var(--brass)]" : ""}`}
              onClick={() => setGuidanceStyle(g.id)}
            >
              {g[L]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-[var(--text-soft)]">
          {copy.setup.language[L]}
          <select
            className="mt-1 w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]"
            value={lang}
            onChange={(e) => setLang(e.target.value === "hi" ? "hi" : "en")}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>
        </label>
        <label className="block text-sm text-[var(--text-soft)]">
          {copy.setup.name[L]}
          <input
            className="mt-1 w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={copy.setup.namePlaceholder[L]}
          />
        </label>
      </section>

      {error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={status === "saving"}
          onClick={() => void save(false)}
          className="rounded-md border border-[var(--brass)]/40 bg-[var(--brass)]/15 px-5 py-3 text-sm text-[var(--brass-soft)] disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : copy.setup.start[L]}
        </button>
        <Link href="/account" className="px-4 py-3 text-sm text-[var(--text-muted)]">
          Back to account
        </Link>
      </div>
      {!user ? (
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Not signed in — draft saved on this device. Sign in to sync.
        </p>
      ) : null}
    </main>
  );
}
