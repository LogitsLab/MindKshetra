"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import {
  FOUNDATION_PROGRAM_ID,
  sessionTranscript,
  type MeditationSession,
} from "@/lib/meditation-core";
import {
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
} from "@/lib/tts";

type Stage = "moodBefore" | "play" | "moodAfter" | "done";

const GUEST_RUN_KEY = `mindkshetra-meditation-run-${FOUNDATION_PROGRAM_ID}`;
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

function markGuestDay(day: number) {
  if (day < 1) return;
  try {
    const raw = localStorage.getItem(GUEST_RUN_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { completedDays?: unknown })
      : { completedDays: [] };
    const prior = Array.isArray(parsed.completedDays)
      ? parsed.completedDays.filter(
          (d): d is number => typeof d === "number" && Number.isInteger(d)
        )
      : [];
    const next = Array.from(new Set([...prior, day])).sort((a, b) => a - b);
    localStorage.setItem(GUEST_RUN_KEY, JSON.stringify({ completedDays: next }));
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

export default function MeditationPlayerClient({
  session,
}: {
  session: MeditationSession;
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
  const [saving, setSaving] = useState(false);
  const [guestSaved, setGuestSaved] = useState(false);
  const [ttsOk, setTtsOk] = useState(false);
  const satSecRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);
  const silenceTotalRef = useRef(0);
  const autoAdvanceRef = useRef(false);

  const signedIn = Boolean(user && !user.is_anonymous);
  const phase = session.phases[phaseIdx];
  const title = lang === "hi" ? session.title_hi : session.title_en;
  const theme = lang === "hi" ? session.theme_hi : session.theme_en;
  const transcript = sessionTranscript(session, lang);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setTtsOk(isSpeechSynthesisSupported());
  }, []);

  // Foundation unlock: Day N only if N-1 completed (or day 1).
  useEffect(() => {
    if (session.tier !== "foundation" || session.day_number <= 1) {
      setLocked(false);
      return;
    }
    let cancelled = false;
    (async () => {
      let completed: number[] = [];
      try {
        const res = await fetch(
          `/api/meditation/progress?program=${FOUNDATION_PROGRAM_ID}`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            completedDays?: number[];
            guest?: boolean;
          };
          if (data.guest) {
            const raw = localStorage.getItem(GUEST_RUN_KEY);
            const parsed = raw
              ? (JSON.parse(raw) as { completedDays?: number[] })
              : {};
            completed = Array.isArray(parsed.completedDays)
              ? parsed.completedDays
              : [];
          } else {
            completed = data.completedDays ?? [];
          }
        }
      } catch {
        try {
          const raw = localStorage.getItem(GUEST_RUN_KEY);
          const parsed = raw
            ? (JSON.parse(raw) as { completedDays?: number[] })
            : {};
          completed = Array.isArray(parsed.completedDays)
            ? parsed.completedDays
            : [];
        } catch {
          completed = [];
        }
      }
      if (!cancelled) {
        setLocked(!completed.includes(session.day_number - 1));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.tier, session.day_number, user]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const advancePhase = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
    setSilenceLeft(null);
    silenceStartRef.current = null;
    if (phaseIdx >= session.phases.length - 1) {
      setStage("moodAfter");
      return;
    }
    setPhaseIdx((i) => i + 1);
  }, [phaseIdx, session.phases.length]);

  // Drive silence timer
  useEffect(() => {
    if (stage !== "play" || !phase || phase.type !== "silence") return;
    silenceTotalRef.current = phase.seconds;
    silenceStartRef.current = Date.now();
    setSilenceLeft(phase.seconds);
    const id = setInterval(() => {
      const start = silenceStartRef.current;
      if (start == null) return;
      const elapsed = Math.floor((Date.now() - start) / 1000);
      satSecRef.current += 1;
      const left = Math.max(0, silenceTotalRef.current - elapsed);
      setSilenceLeft(left);
      if (left <= 0) {
        clearInterval(id);
        advancePhase();
      }
    }, 500);
    return () => clearInterval(id);
  }, [stage, phase, phaseIdx, advancePhase]);

  // Auto-speak on speak phases
  useEffect(() => {
    if (stage !== "play" || !phase || phase.type !== "speak") return;
    autoAdvanceRef.current = true;
    const text = lang === "hi" ? phase.text_hi : phase.text_en;
    const started = speakText(text, {
      lang,
      rate,
      onStart: () => setSpeaking(true),
      onEnd: () => {
        setSpeaking(false);
        if (autoAdvanceRef.current) advancePhase();
      },
      onError: () => {
        setSpeaking(false);
      },
    });
    if (!started) {
      setSpeaking(false);
    }
    return () => {
      autoAdvanceRef.current = false;
      stopSpeaking();
    };
  }, [stage, phaseIdx, phase, lang, rate, advancePhase]);

  function startPlay() {
    satSecRef.current = 0;
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
      markGuestDay(session.day_number);
      queueGuestCompletion(body);
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
      setStage("done");
    } catch {
      markGuestDay(session.day_number);
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
      <div className="mt-6 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            className={`min-h-11 min-w-11 border px-3 py-2 text-sm transition ${
              value === n
                ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass-soft)]"
                : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="max-w-2xl">
      <p className="mb-6">
        <Link
          href="/meditation"
          className="text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          ← {t("medBack")}
        </Link>
      </p>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {session.tier === "daily"
            ? t("medDailiesTitle")
            : `Day ${session.day_number}`}{" "}
          · {session.duration_minutes} min
        </p>
        <h1 className="mt-2 font-display text-3xl text-[var(--text)]">{title}</h1>
        <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {theme}
        </p>
      </header>

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

      {!locked && stage === "moodBefore" ? (
        <>
          <MoodRow
            label={t("medMoodBefore")}
            value={moodBefore}
            onPick={(n) => {
              setMoodBefore(n);
              startPlay();
            }}
          />
        </>
      ) : null}

      {!locked && stage === "play" && phase ? (
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--brass-soft)]">
            <span>
              {phase.type === "speak" ? t("medPhaseSpeak") : t("medPhaseSilence")}{" "}
              · {phaseIdx + 1}/{session.phases.length}
            </span>
            <label className="flex items-center gap-2 normal-case tracking-normal text-[var(--text-muted)]">
              {t("medRateLabel")}
              <select
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="border border-[var(--line)] bg-transparent px-2 py-1 text-sm text-[var(--text)]"
              >
                <option value={0.85}>{t("medRateSlow")}</option>
                <option value={1}>{t("medRateNormal")}</option>
                <option value={1.15}>{t("medRateFast")}</option>
              </select>
            </label>
          </div>

          {phase.type === "speak" ? (
            <div className="border-l-2 border-[var(--brass)]/50 pl-5">
              <p className="text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
                {lang === "hi" ? phase.text_hi : phase.text_en}
              </p>
              {!ttsOk ? (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {t("medVoiceUnsupported")}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {speaking ? (
                  <button
                    type="button"
                    onClick={() => {
                      autoAdvanceRef.current = false;
                      stopSpeaking();
                      setSpeaking(false);
                    }}
                    className="min-h-10 border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)]"
                  >
                    {t("medStopVoice")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    autoAdvanceRef.current = false;
                    stopSpeaking();
                    advancePhase();
                  }}
                  className="min-h-10 border border-[var(--line)] px-4 py-2 text-sm text-[var(--brass-soft)]"
                >
                  {t("medSkipSpeak")}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="font-display text-5xl text-[var(--text)] tabular-nums">
                {formatClock(silenceLeft ?? phase.seconds)}
              </p>
              <button
                type="button"
                onClick={advancePhase}
                className="mt-6 min-h-10 px-4 text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
              >
                {t("medNextPhase")}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="mt-8 text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            {showTranscript ? t("medHideTranscript") : t("medTranscript")}
          </button>
          {showTranscript ? (
            <pre className="mt-4 whitespace-pre-wrap border border-[var(--hairline)] p-4 text-sm font-light leading-relaxed text-[var(--text-muted)]">
              {transcript}
            </pre>
          ) : null}
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
            {t("medDoneTitle")}
          </h2>
          <p className="mt-3 text-[var(--text-muted)]">{t("medDoneBody")}</p>
          {guestSaved ? (
            <p className="mt-2 text-sm text-[var(--brass-soft)]">
              {t("medGuestSaved")}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/meditation"
              className="min-h-11 bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)]"
            >
              {t("medBack")}
            </Link>
            <Link
              href="/sadhana"
              className="min-h-11 border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--brass-soft)]"
            >
              {t("medBridgeSadhana")}
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
