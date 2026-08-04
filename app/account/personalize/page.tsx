"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type PrefPayload = {
  goals?: GoalId[];
  inspirations?: InspirationId[];
  dailyTimeMinutes?: number | null;
  guidanceStyle?: GuidanceStyleId | null;
  displayName?: string;
  preferredLanguage?: "en" | "hi" | null;
};

function applyPrefs(
  draft: PrefPayload,
  setters: {
    setGoals: (g: GoalId[]) => void;
    setInspirations: (g: InspirationId[]) => void;
    setDailyTimeMinutes: (n: number) => void;
    setGuidanceStyle: (g: GuidanceStyleId) => void;
    setDisplayName: (s: string) => void;
    setLang: (l: "en" | "hi") => void;
  }
) {
  if (Array.isArray(draft.goals)) setters.setGoals(draft.goals);
  if (Array.isArray(draft.inspirations)) setters.setInspirations(draft.inspirations);
  if (typeof draft.dailyTimeMinutes === "number") {
    setters.setDailyTimeMinutes(draft.dailyTimeMinutes);
  }
  if (draft.guidanceStyle) setters.setGuidanceStyle(draft.guidanceStyle);
  if (typeof draft.displayName === "string") setters.setDisplayName(draft.displayName);
  if (draft.preferredLanguage === "hi" || draft.preferredLanguage === "en") {
    setters.setLang(draft.preferredLanguage);
  }
}

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
  const [hydrating, setHydrating] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const setters = {
        setGoals,
        setInspirations,
        setDailyTimeMinutes,
        setGuidanceStyle,
        setDisplayName,
        setLang,
      };

      // Local draft first (instant), then server wins when signed in.
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) applyPrefs(JSON.parse(raw) as PrefPayload, setters);
      } catch {
        /* ignore */
      }

      if (user) {
        try {
          const res = await fetch("/api/account/preferences");
          if (res.ok) {
            const data = (await res.json()) as PrefPayload;
            if (alive) applyPrefs(data, setters);
          }
        } catch {
          /* keep draft */
        }
      }
      if (alive) setHydrating(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, setLang]);

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
          Refine your practice around the attention, language, and rhythm that
          serve you now.
        </p>
      </header>
      {hydrating ? (
        <p className="text-sm text-[var(--text-muted)]">Loading preferences…</p>
      ) : (
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
            <h2 className="eyebrow text-[var(--brass-soft)]">
              Divine archetype focus
            </h2>
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
            <button
              type="button"
              className="mt-3 text-sm text-[var(--text-muted)]"
              onClick={() => setInspirations([])}
            >
              {copy.inspirations.none[L]}
            </button>
          </div>

          <div className="mt-8 grid gap-8 border-t border-[var(--hairline)] pt-8 sm:grid-cols-2">
            <div>
              <h2 className="eyebrow text-[var(--brass-soft)]">Guidance style</h2>
              <div className="mt-4 space-y-2">
                {GUIDANCE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setGuidanceStyle(style.id)}
                    className={`block w-full rounded border px-4 py-2.5 text-left text-sm ${
                      guidanceStyle === style.id
                        ? "border-[var(--brass)] text-[var(--brass-soft)]"
                        : "border-[var(--hairline)] text-[var(--text-muted)]"
                    }`}
                  >
                    {style[L]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="eyebrow text-[var(--brass-soft)]">Daily commitment</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {DAILY_TIME_OPTIONS.map((time) => (
                  <button
                    key={time.minutes}
                    type="button"
                    onClick={() => setDailyTimeMinutes(time.minutes)}
                    className={`rounded border px-4 py-2 text-sm ${
                      dailyTimeMinutes === time.minutes
                        ? "border-[var(--brass)] bg-[var(--brass)] text-[var(--on-brass)]"
                        : "border-[var(--line)] text-[var(--text-muted)]"
                    }`}
                  >
                    {time.minutes}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}
          <button
            type="button"
            disabled={status === "saving"}
            onClick={() => void save(false)}
            className="mt-8 w-full rounded-lg bg-[var(--brass)] px-6 py-4 text-sm font-semibold uppercase tracking-[.18em] text-[var(--on-brass)] hover:bg-[var(--brass-soft)] disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save journey"}
          </button>
          {!user ? (
            <p className="mt-3 text-center text-[10px] text-[var(--text-muted)]">
              Drafts stay on this device until sign-in.
            </p>
          ) : null}
        </section>
      )}
    </AccountJourneyShell>
  );
}
