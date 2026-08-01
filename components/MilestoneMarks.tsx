"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { getGuestCompletedIds } from "@/lib/guest-progress";
import {
  milestonesFor,
  nextMilestone,
  type Milestone,
  type MilestoneMotif,
  type MilestoneStats,
} from "@/lib/milestones";
import { foldStreakDays } from "@/lib/sadhana-core";
import { track } from "@/lib/track";

/**
 * Quiet-milestone surfaces (WS4): the thin brass-stroke motifs, the account
 * "Practice marks" panel, and the at-most-one newly-crossed line completion
 * moments show. Marks are private to their user — no sharing, no comparison.
 *
 * Motifs reuse the avatar-preset vocabulary (lotus, conch, wheel, diya,
 * veena, peacock — lib/profiles.ts) plus four new ones (mala, surya,
 * kalasha, patha) in the same hairline style as public/ornaments/*.svg:
 * currentColor strokes around 1px, no fills, no circles-with-icons-in-them.
 */

const MOTIF_PATHS: Record<MilestoneMotif, JSX.Element> = {
  lotus: (
    <>
      <path d="M12 12.5C10.6 9.8 10.6 6.7 12 4c1.4 2.7 1.4 5.8 0 8.5z" />
      <path d="M12 12.5c-2.2-.6-4.2-2.2-5.4-4.6 2.7.2 4.7 1.7 5.4 4.6z" />
      <path d="M12 12.5c2.2-.6 4.2-2.2 5.4-4.6-2.7.2-4.7 1.7-5.4 4.6z" />
      <path d="M4.5 14.5c2 3.2 4.6 4.8 7.5 4.8s5.5-1.6 7.5-4.8" />
    </>
  ),
  conch: (
    <>
      <path d="M14.8 4.8c3 1.5 4.7 4.2 4.3 7.3-.5 3.9-3.8 6.7-7.7 6.7-3.1 0-5.7-2-6.4-4.9-.5-2.4.8-4.8 3-5.6 1.9-.7 3.9 0 4.8 1.6.8 1.3.5 2.9-.7 3.8" />
      <path d="M6 17.5 4.2 19.8" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 4v5.8M12 14.2V20M4 12h5.8M14.2 12H20M6.3 6.3l4.1 4.1M13.6 13.6l4.1 4.1M17.7 6.3l-4.1 4.1M10.4 13.6l-4.1 4.1" />
    </>
  ),
  diya: (
    <>
      <path d="M5 13.5h14c-.5 3.2-3.4 5.5-7 5.5s-6.5-2.3-7-5.5z" />
      <path d="M12 10.8c-1.5-1.3-1.5-3.4 0-5.6 1.5 2.2 1.5 4.3 0 5.6z" />
    </>
  ),
  veena: (
    <>
      <path d="M8.6 15.4 17 7" />
      <circle cx="7.2" cy="16.8" r="2.9" />
      <circle cx="17.6" cy="6.4" r="2.1" />
      <path d="M11.4 12.2l1.4 1.4M13.8 9.8l1.4 1.4" />
    </>
  ),
  peacock: (
    <>
      <path d="M11 20c0-6 1.6-10.6 4.4-13.8" />
      <circle cx="16.6" cy="5.4" r="2.6" />
      <circle cx="16.6" cy="5.4" r="0.9" />
      <path d="M8.6 15.6c1.6-.6 3.2-.6 4.8-.1M9.8 11.4c1.3-.5 2.7-.5 4-.1" />
    </>
  ),
  mala: (
    <>
      <circle cx="12" cy="4.8" r="1.3" />
      <circle cx="17.1" cy="6.9" r="1.3" />
      <circle cx="19.2" cy="12" r="1.3" />
      <circle cx="17.1" cy="17.1" r="1.3" />
      <circle cx="6.9" cy="17.1" r="1.3" />
      <circle cx="4.8" cy="12" r="1.3" />
      <circle cx="6.9" cy="6.9" r="1.3" />
      <circle cx="12" cy="19" r="1.8" />
      <path d="M12 20.8v1.4" />
    </>
  ),
  surya: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </>
  ),
  kalasha: (
    <>
      <path d="M8.6 9.5c-2.2 1.2-3.6 3.2-3.6 5.2 0 3.1 3.1 5.3 7 5.3s7-2.2 7-5.3c0-2-1.4-4-3.6-5.2" />
      <path d="M8.2 9.5h7.6M9.2 6.8h5.6M9.2 6.8l-.6 2.7M14.8 6.8l.6 2.7" />
      <path d="M12 6.8V4.6M10.2 5c.6-.9 1.2-1.3 1.8-1.3S13.2 4.1 13.8 5" />
    </>
  ),
  patha: (
    <>
      <path d="M8 20c1-6.5 3.2-11.8 7-16" />
      <path d="M14 20c.4-5.6 1.9-10.8 4.6-15.6" />
      <path d="M10.6 16.2h2.9M11.9 11.4h2.4" />
    </>
  ),
};

export function MilestoneMark({
  motif,
  size = 28,
  className = "",
}: {
  motif: MilestoneMotif;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {MOTIF_PATHS[motif]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* State: server aggregate for sessions, device logs for pure guests.  */
/* ------------------------------------------------------------------ */

type MilestoneSummary = {
  visitCurrent: number;
  visitLongest: number;
  versesRead: number;
  /** null when the corpus size is unknown (guest-local computation). */
  totalVerses: number | null;
  japaLifetimeCount: number;
};

type MilestoneState = {
  guest: boolean;
  milestones: Milestone[];
  next: Milestone | null;
  summary: MilestoneSummary;
};

/** Written by SadhanaClient — the device-only practice log guests keep. */
const SADHANA_DEVICE_LOG_KEY = "mindkshetra-sadhana-log";

function guestLocalStats(): MilestoneStats {
  let flowDays: string[] = [];
  let japaDays: string[] = [];
  let japaLifetimeCount = 0;
  try {
    const parsed = JSON.parse(
      localStorage.getItem(SADHANA_DEVICE_LOG_KEY) ?? "[]"
    );
    if (Array.isArray(parsed)) {
      for (const session of parsed) {
        if (!session || typeof session !== "object") continue;
        const { practice, occurredOn, count } = session as {
          practice?: unknown;
          occurredOn?: unknown;
          count?: unknown;
        };
        if (typeof occurredOn !== "string") continue;
        if (practice === "flow") flowDays.push(occurredOn);
        if (practice === "japa") {
          japaDays.push(occurredOn);
          japaLifetimeCount += Number(count) || 0;
        }
      }
    }
  } catch {
    flowDays = [];
    japaDays = [];
  }

  const dedupe = (days: string[]) => Array.from(new Set(days)).sort();
  return {
    practiceStreakDays: {
      flow: foldStreakDays(dedupe(flowDays)).longest,
      japa: foldStreakDays(dedupe(japaDays)).longest,
    },
    japaLifetimeCount,
    versesRead: getGuestCompletedIds().length,
    // Visit streaks, chapters and paths need server-side context; the panel
    // invites sign-in for the rest.
  };
}

function loadLocalState(): MilestoneState {
  const stats = guestLocalStats();
  return {
    guest: true,
    milestones: milestonesFor(stats),
    next: nextMilestone(stats),
    summary: {
      visitCurrent: 0,
      visitLongest: 0,
      versesRead: stats.versesRead ?? 0,
      totalVerses: null,
      japaLifetimeCount: stats.japaLifetimeCount ?? 0,
    },
  };
}

export async function loadMilestoneState(): Promise<MilestoneState> {
  try {
    const res = await fetch("/api/account/milestones");
    if (res.ok) {
      const data = (await res.json()) as {
        guest?: boolean;
        milestones?: Milestone[];
        next?: Milestone | null;
        summary?: MilestoneSummary;
      };
      if (!data.guest && data.summary) {
        return {
          guest: false,
          milestones: data.milestones ?? [],
          next: data.next ?? null,
          summary: data.summary,
        };
      }
    }
  } catch {
    /* fall through to the device-local view */
  }
  return loadLocalState();
}

/* ------------------------------------------------------------------ */
/* Newly-crossed detection for completion moments.                     */
/* ------------------------------------------------------------------ */

const SEEN_KEY = "mk-milestones-seen";

function readSeen(): string[] | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : null;
  } catch {
    return null;
  }
}

function writeSeen(keys: string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(new Set(keys))));
  } catch {
    /* ignore */
  }
}

/**
 * At most ONE newly-crossed milestone for a completion moment. Everything
 * earned is remembered on this device, so a mark announces itself exactly
 * once. On a device that has never seen the ledger, a long history backfills
 * silently — only a single earned mark (a genuinely fresh practice) shows.
 */
export async function takeNewMilestone(): Promise<Milestone | null> {
  const state = await loadMilestoneState();
  const earnedKeys = state.milestones.map((m) => m.key);
  const seen = readSeen();
  if (seen === null) {
    writeSeen(earnedKeys);
    return state.milestones.length === 1 ? state.milestones[0] : null;
  }
  const fresh = state.milestones.filter((m) => !seen.includes(m.key));
  writeSeen([...seen, ...earnedKeys]);
  return fresh[0] ?? null;
}

/**
 * The one-sentence brass moment line. Fires the milestone_shown event exactly
 * once per newly-crossed render; motion is .animate-rise, which the global
 * prefers-reduced-motion wildcard already suppresses.
 */
export function MilestoneLine({ milestone }: { milestone: Milestone }) {
  const { lang } = useLanguage();
  const firedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (firedForRef.current === milestone.key) return;
    firedForRef.current = milestone.key;
    track("milestone_shown", { key: milestone.key });
  }, [milestone.key]);

  const text = lang === "hi" ? milestone.hi : milestone.en;
  return (
    <p className="animate-rise mt-3 flex items-center gap-2.5 text-[15px] text-[var(--brass-soft)]">
      <MilestoneMark motif={milestone.motif} size={22} className="text-[var(--brass)]" />
      <span>
        {text.name} · {text.line}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Account panel.                                                      */
/* ------------------------------------------------------------------ */

export function PracticeMarks() {
  const { user, loading } = useAuth();
  const { lang, t } = useLanguage();
  const [state, setState] = useState<MilestoneState | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    void (async () => {
      const next = user ? await loadMilestoneState() : loadLocalState();
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (!state) return null;

  const { milestones, next, summary } = state;
  const nextText = next ? (lang === "hi" ? next.hi : next.en) : null;

  return (
    <section className="mt-12 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
          {t("marksTitle")}
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t("marksBlurb")}</p>
      </div>

      <div className="glass px-5 py-6 sm:px-7 sm:py-7">
        {summary.visitLongest > 0 || summary.totalVerses ? (
          <div className="space-y-1 pb-5 text-sm text-[var(--text-soft)]">
            {summary.visitLongest > 0 ? (
              <p>
                {t("marksStreakLine")
                  .replace("{longest}", String(summary.visitLongest))
                  .replace("{current}", String(summary.visitCurrent))}
              </p>
            ) : null}
            {summary.totalVerses ? (
              <p>
                {t("marksVersesLine")
                  .replace("{n}", String(summary.versesRead))
                  .replace("{total}", String(summary.totalVerses))}
              </p>
            ) : null}
          </div>
        ) : null}

        {milestones.length > 0 ? (
          <ul className="grid grid-cols-2 overflow-hidden border border-[var(--line)] sm:grid-cols-3">
            {milestones.map((m) => {
              const text = lang === "hi" ? m.hi : m.en;
              return (
                <li
                  key={m.key}
                  className="-ml-px -mt-px space-y-2 border-l border-t border-[var(--hairline)] px-4 py-4"
                >
                  <MilestoneMark motif={m.motif} className="text-[var(--brass)] opacity-80" />
                  <p className="text-sm leading-snug text-[var(--text)]">
                    {text.name}
                  </p>
                  <p className="text-xs font-light leading-relaxed text-[var(--text-soft)]">
                    {text.line}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
            {t("marksEmpty")}
          </p>
        )}

        {nextText ? (
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            {t("marksNext").replace("{name}", nextText.name)}
          </p>
        ) : null}

        {state.guest && milestones.length > 0 ? (
          <p className="mt-5 border-t border-[var(--hairline)] pt-4 text-sm font-light leading-relaxed text-[var(--text-soft)]">
            {t("marksGuestHint")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
