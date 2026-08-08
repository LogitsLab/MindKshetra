"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import {
  SITTING_COURSE_ID,
  isDayUnlocked,
  type MeditationSession,
  type SittingMilestone,
  sessionTranscript,
} from "@/lib/meditation-core";
import { markGuestJourneyDay } from "@/lib/journeys/local";
import { playSoftBell, startAmbient, stopAmbient } from "@/lib/audio/ambient";
import { playOrSpeak, stopNarration } from "@/lib/audio/narration";
import { isSpeechSynthesisSupported } from "@/lib/tts";

type Stage = "moodBefore" | "play" | "moodAfter" | "done";

const LEGACY_GUEST_KEY = "mindkshetra-meditation-run-foundation-7";
const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

function newClientRef(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

function markGuestDay(day: number, daysCount: number) {
  if (day < 1) return;
  markGuestJourneyDay(SITTING_COURSE_ID, day, daysCount);
  try {
    const raw = localStorage.getItem(LEGACY_GUEST_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { completedDays?: unknown })
      : { completedDays: [] };
    const prior = Array.isArray(parsed.completedDays)
      ? parsed.completedDays.filter(
          (d): d is number => typeof d === "number" && Number.isInteger(d)
        )
      : [];
    const next = Array.from(new Set([...prior, day])).sort((a, b) => a - b);
    localStorage.setItem(LEGACY_GUEST_KEY, JSON.stringify({ completedDays: next }));
  } catch {
    /* ignore */
  }
}

function queueGuestCompletion(row: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(GUEST_QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    const next = Array.isArray(list) ? [...list, row].slice(-90) : [row];
    localStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function milestoneCopy(
  m: SittingMilestone,
  t: (k: "medMilestone7" | "medMilestone21" | "medMilestone45") => string
): string {
  if (m === 7) return t("medMilestone7");
  if (m === 21) return t("medMilestone21");
  return t("medMilestone45");
}

export default function MeditationPlayerClient({
  session,
  daysCount = 45,
}: {
  session: MeditationSession;
  daysCount?: number;
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("moodBefore");
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [silenceLeft, setSilenceLeft] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [rate, setRate] = useState(1);
  const [ambientOn, setAmbientOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guestSaved, setGuestSaved] = useState(false);
  const [ttsOk, setTtsOk] = useState(false);
  const [milestone, setMilestone] = useState<SittingMilestone | null>(null);
  const satSecRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);
  const satCreditedRef = useRef(0);
  const silenceTotalRef = useRef(0);
  const autoAdvanceRef = useRef(false);

  const signedIn = Boolean(user && !user.is_anonymous);
  const phase = session.phases[phaseIdx];
  const title = lang === "hi" ? session.title_hi : session.title_en;
  const theme = lang === "hi" ? session.theme_hi : session.theme_en;
  const transcript = sessionTranscript(session, lang);
  const [locked, setLocked] = useState(false);
  const isCourse = session.tier !== "daily";
  const nextDay =
    isCourse && session.day_number < daysCount
      ? session.day_number + 1
      : null;

  useEffect(() => {
    setTtsOk(isSpeechSynthesisSupported());
  }, []);

  useEffect(() => {
    if (!isCourse || session.day_number <= 1) {
      setLocked(false);
      return;
    }
    let cancelled = false;
    (async () => {
      let completed: number[] = [];
      try {
        const res = await fetch(
          `/api/meditation/progress?program=${SITTING_COURSE_ID}`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            completedDays?: number[];
            guest?: boolean;
          };
          if (data.guest) {
            completed = (() => {
              try {
                const raw =
                  localStorage.getItem(
                    `mindkshetra-journey-${SITTING_COURSE_ID}`
                  ) || localStorage.getItem(LEGACY_GUEST_KEY);
                const parsed = raw
                  ? (JSON.parse(raw) as { completedDays?: number[] })
                  : {};
                return Array.isArray(parsed.completedDays)
                  ? parsed.completedDays
                  : [];
              } catch {
                return [];
              }
            })();
          } else {
            completed = data.completedDays ?? [];
          }
        }
      } catch {
        completed = [];
      }
      if (!cancelled) {
        setLocked(
          !isDayUnlocked(session.day_number, completed, daysCount)
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCourse, session.day_number, daysCount, user]);

  useEffect(() => {
    return () => stopNarration();
  }, []);

  const advancePhase = useCallback(() => {
    stopNarration();
    stopAmbient();
    setSpeaking(false);
    setSilenceLeft(null);
    silenceStartRef.current = null;
    if (phaseIdx >= session.phases.length - 1) {
      void playSoftBell();
      setStage("moodAfter");
      return;
    }
    setPhaseIdx((i) => i + 1);
  }, [phaseIdx, session.phases.length]);

  useEffect(() => {
    if (stage !== "play" || !phase || phase.type !== "silence") return;
    silenceTotalRef.current = phase.seconds;
    silenceStartRef.current = Date.now();
    satCreditedRef.current = 0;
    setSilenceLeft(phase.seconds);
    const id = setInterval(() => {
      const start = silenceStartRef.current;
      if (start == null) return;
      const elapsed = Math.floor((Date.now() - start) / 1000);
      satSecRef.current += Math.max(0, elapsed - satCreditedRef.current);
      satCreditedRef.current = elapsed;
      const left = Math.max(0, silenceTotalRef.current - elapsed);
      setSilenceLeft(left);
      if (left <= 0) {
        clearInterval(id);
        advancePhase();
      }
    }, 500);
    return () => clearInterval(id);
  }, [stage, phase, phaseIdx, advancePhase]);

  useEffect(() => {
    if (stage !== "play" || !phase || phase.type !== "speak") return;
    autoAdvanceRef.current = true;
    const text = lang === "hi" ? phase.text_hi : phase.text_en;
    let cancelled = false;
    void playOrSpeak(text, {
      lang,
      rate,
      onStart: () => {
        if (!cancelled) setSpeaking(true);
      },
      onEnd: () => {
        if (cancelled) return;
        setSpeaking(false);
        if (autoAdvanceRef.current) advancePhase();
      },
      onError: () => {
        if (!cancelled) setSpeaking(false);
      },
    }).then((started) => {
      if (!started && !cancelled) setSpeaking(false);
    });
    return () => {
      cancelled = true;
      autoAdvanceRef.current = false;
      stopNarration();
    };
  }, [stage, phaseIdx, phase, lang, rate, advancePhase]);

  // Music rides with the silence countdown — auto-starts, user can stop/play.
  useEffect(() => {
    if (stage !== "play" || phase?.type !== "silence" || !ambientOn) {
      stopAmbient();
      return;
    }
    void startAmbient(0.08);
    return () => {
      stopAmbient();
    };
  }, [stage, phase?.type, phaseIdx, ambientOn]);

  function startPlay() {
    satSecRef.current = 0;
    satCreditedRef.current = 0;
    setPhaseIdx(0);
    setStage("play");
  }

  async function finish() {
    setSaving(true);
    const clientRef = newClientRef();
    const durationSec = Math.max(
      1,
      satSecRef.current || session.duration_minutes * 60
    );
    const body = {
      sessionId: session.id,
      moodBefore,
      moodAfter,
      durationSec,
      clientRef,
      timezone: (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
          return undefined;
        }
      })(),
    };

    if (!signedIn) {
      markGuestDay(session.day_number, daysCount);
      queueGuestCompletion(body);
      if (
        session.day_number === 7 ||
        session.day_number === 21 ||
        session.day_number === 45
      ) {
        setMilestone(session.day_number as SittingMilestone);
      }
      setGuestSaved(true);
      setStage("done");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/meditation/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        progress?: { milestone?: SittingMilestone | null };
        milestone?: SittingMilestone | null;
      };
      setMilestone(data.milestone ?? data.progress?.milestone ?? null);
      setStage("done");
    } catch {
      markGuestDay(session.day_number, daysCount);
      queueGuestCompletion(body);
      setGuestSaved(true);
      setStage("done");
    } finally {
      setSaving(false);
    }
  }

  const MoodRow = ({
    value,
    onPick,
    label,
  }: {
    value: number | null;
    onPick: (n: number) => void;
    label: string;
  }) => (
    <section>
      <h2 className="font-display text-2xl text-[var(--text)]">{label}</h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t("medMoodHint")}</p>
      <div className="med-mood mt-6">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            className={`med-mood__mark ${value === n ? "is-active" : ""}`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </section>
  );

  const silenceTotal =
    phase?.type === "silence" ? phase.seconds : 0;
  const silenceRemaining =
    phase?.type === "silence" ? (silenceLeft ?? silenceTotal) : 0;
  const silenceProgress =
    silenceTotal > 0 ? 1 - silenceRemaining / silenceTotal : 0;
  const ringSize = 220;
  const ringRadius = 96;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - silenceProgress);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-5">
        <Link
          href="/meditation"
          className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          ← {t("medBack")}
        </Link>
      </p>

      {locked ? (
        <p className="border border-[var(--line)] px-4 py-6 text-[var(--text-muted)]">
          {t("medDayLocked")} —{" "}
          <Link
            href="/meditation"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            {t("medBack")}
          </Link>
        </p>
      ) : null}

      {!locked && stage !== "play" ? (
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
            {session.tier === "daily"
              ? t("medDailiesTitle")
              : `Day ${session.day_number}`}{" "}
            · {session.duration_minutes} min
          </p>
          <h1 className="mt-2 font-display text-3xl text-[var(--text)]">
            {title}
          </h1>
          <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
            {theme}
          </p>
        </header>
      ) : null}

      {!locked && stage === "moodBefore" ? (
        <MoodRow
          label={t("medMoodBefore")}
          value={moodBefore}
          onPick={(n) => {
            setMoodBefore(n);
            startPlay();
          }}
        />
      ) : null}

      {!locked && stage === "play" && phase ? (
        <section className="med-player min-h-[32rem] sm:min-h-[36rem]">
          <Image
            src="/images/paths/meditation.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_30%]"
          />
          <div className="med-player__wash" aria-hidden />

          <div className="relative z-10 flex min-h-[32rem] flex-col px-6 py-8 sm:min-h-[36rem] sm:px-10 sm:py-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
                  {session.tier === "daily"
                    ? t("medDailiesTitle")
                    : `Day ${session.day_number}`}{" "}
                  · {phase.type === "speak"
                    ? t("medPhaseSpeak")
                    : t("medPhaseSilence")}{" "}
                  · {phaseIdx + 1}/{session.phases.length}
                </p>
                <h1 className="mt-2 font-display text-2xl text-white sm:text-3xl">
                  {title}
                </h1>
              </div>
              {phase.type === "speak" ? (
                <label className="flex items-center gap-2 text-xs text-white/55">
                  {t("medRateLabel")}
                  <select
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="border border-white/20 bg-black/30 px-2 py-1 text-sm text-white"
                  >
                    <option value={0.85}>{t("medRateSlow")}</option>
                    <option value={1}>{t("medRateNormal")}</option>
                    <option value={1.15}>{t("medRateFast")}</option>
                  </select>
                </label>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-8">
              {phase.type === "silence" ? (
                <>
                  <div className="relative flex h-[220px] w-[220px] items-center justify-center">
                    <svg
                      width={ringSize}
                      height={ringSize}
                      viewBox={`0 0 ${ringSize} ${ringSize}`}
                      className="med-player__ring absolute inset-0"
                      aria-hidden
                    >
                      <circle
                        className="med-player__ring-track"
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                      />
                      <circle
                        className="med-player__ring-progress"
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                      />
                    </svg>
                    <p className="font-display text-4xl text-white tabular-nums sm:text-5xl">
                      {formatClock(silenceRemaining)}
                    </p>
                  </div>
                  <p className="mt-6 text-sm tracking-[0.14em] text-white/55">
                    {t("medSilenceHint")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAmbientOn((v) => !v)}
                    className="mt-6 inline-flex h-10 items-center border border-white/25 px-4 text-sm text-white/80"
                    aria-pressed={ambientOn}
                  >
                    {ambientOn ? t("medAmbientOn") : t("medAmbientOff")}
                  </button>
                  <button
                    type="button"
                    onClick={advancePhase}
                    className="mt-4 min-h-10 px-4 text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
                  >
                    {t("medNextPhase")}
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
                    {t("medListeningHint")}
                  </p>
                  <p className="max-w-xl text-center font-display text-xl font-light leading-relaxed text-white/90 sm:text-2xl">
                    {lang === "hi" ? phase.text_hi : phase.text_en}
                  </p>
                  {!ttsOk ? (
                    <p className="mt-4 text-sm text-white/50">
                      {t("medVoiceUnsupported")}
                    </p>
                  ) : null}
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    {speaking ? (
                      <button
                        type="button"
                        onClick={() => {
                          autoAdvanceRef.current = false;
                          stopNarration();
                          setSpeaking(false);
                        }}
                        className="inline-flex h-10 items-center border border-white/25 px-4 text-sm text-white/70"
                      >
                        {t("medStopVoice")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        autoAdvanceRef.current = false;
                        stopNarration();
                        advancePhase();
                      }}
                      className="inline-flex h-10 items-center border border-[var(--brass)]/45 px-4 text-sm text-[var(--brass-soft)]"
                    >
                      {t("medSkipSpeak")}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-auto border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
              >
                {showTranscript ? t("medHideTranscript") : t("medTranscript")}
              </button>
              {showTranscript ? (
                <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm font-light leading-relaxed text-white/55">
                  {transcript}
                </pre>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {!locked && stage === "moodAfter" ? (
        <>
          <MoodRow
            label={t("medMoodAfter")}
            value={moodAfter}
            onPick={(n) => {
              setMoodAfter(n);
            }}
          />
          <button
            type="button"
            disabled={moodAfter == null || saving}
            onClick={() => void finish()}
            className="mt-8 min-h-11 bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
          >
            {saving ? t("medSaving") : t("medComplete")}
          </button>
        </>
      ) : null}

      {!locked && stage === "done" ? (
        <section>
          <h2 className="font-display text-2xl text-[var(--text)]">
            {milestone
              ? t("medMilestoneTitle")
              : t("medDoneTitle")}
          </h2>
          <p className="mt-3 text-[var(--text-muted)]">
            {milestone
              ? milestoneCopy(milestone, t)
              : t("medDoneBody")}
          </p>
          {guestSaved ? (
            <p className="mt-2 text-sm text-[var(--brass-soft)]">
              {t("medGuestSaved")}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-4">
            {nextDay && milestone !== 45 ? (
              <Link
                href={`/meditation/${nextDay}`}
                className="min-h-11 bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)]"
              >
                {fillContinue(t("medContinue"), nextDay)}
              </Link>
            ) : (
              <Link
                href="/meditation"
                className="min-h-11 bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)]"
              >
                {t("medBack")}
              </Link>
            )}
            <Link
              href="/sadhana"
              className="min-h-11 border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--brass-soft)]"
            >
              {t("medBridgeSadhana")}
            </Link>
            <Link
              href="/paths"
              className="min-h-11 border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--brass-soft)]"
            >
              {t("medBridgePaths")}
            </Link>
            <Link
              href="/support"
              className="min-h-11 px-2 py-2.5 text-sm text-[var(--text-muted)] underline-offset-2 hover:underline"
            >
              {t("medBridgeSupport")}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function fillContinue(template: string, n: number) {
  return template.replace("{n}", String(n));
}
