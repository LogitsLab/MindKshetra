"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { moods } from "@/lib/moods-data";
import { markGuestPathDay } from "@/lib/paths-local";
import { splitVerseLines } from "@/lib/verseDisplay";

type Sloka = {
  id: number;
  chapter: number;
  verse_number: number;
  sanskrit_devanagari: string;
  hindi_translation: string;
  english_translation: string;
};

type Streak = { current: number; longest: number; graceUsedToday?: boolean };

type Stage = "mood" | "sit" | "sitDone" | "reflect" | "done";

/**
 * Arrival from a path day (/paths/[id] → "Begin day's practice"). Completing
 * the flow then marks that day on the run — the same write the path page's
 * "Mark day complete" button performs — and the done screen can point at
 * tomorrow, closing the paths → sadhana → paths loop.
 */
type PathContext = {
  pathId: string;
  pathDay: number;
  /** days_count of the path; null on older links without the param. */
  pathTotal: number | null;
};

type VerseState = "idle" | "loading" | "loaded" | "failed";

/** How today's flow ended up recorded — never pretend, never guess. */
type LogOutcome = "recorded" | "deviceOnly" | "failed";

function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function newClientRef(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Last-resort v4-shaped ref; only used when crypto.randomUUID is absent.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/**
 * Device-local practice log for visitors with no session at all. The
 * done-stage copy says "counted on this device" — this store is what makes
 * that sentence true. /api/sadhana/merge replays it (idempotent via
 * clientRef) the next time this screen mounts with a signed-in user, the
 * same pattern the mobile app uses in storage/local.ts.
 */
const DEVICE_LOG_KEY = "mindkshetra-sadhana-log";

type DeviceSession = {
  practice: "flow" | "japa";
  occurredOn: string;
  durationSec?: number;
  count?: number;
  clientRef: string;
};

function localDayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function readDeviceLog(): DeviceSession[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEVICE_LOG_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as DeviceSession[]) : [];
  } catch {
    return [];
  }
}

function appendDeviceLog(session: DeviceSession): void {
  try {
    const log = [...readDeviceLog(), session].slice(-90);
    localStorage.setItem(DEVICE_LOG_KEY, JSON.stringify(log));
  } catch {
    /* storage unavailable — the copy still points at sign-in */
  }
}

function clearDeviceLog(): void {
  try {
    localStorage.removeItem(DEVICE_LOG_KEY);
  } catch {
    /* ignore */
  }
}

async function logPractice(
  body: Record<string, unknown>
): Promise<
  { ok: true; streak: Streak } | { ok: false; reason: "signedOut" | "failed" }
> {
  try {
    const res = await fetch("/api/sadhana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: deviceTimezone(), ...body }),
    });
    if (res.status === 401) return { ok: false, reason: "signedOut" };
    if (!res.ok) return { ok: false, reason: "failed" };
    const data = await res.json();
    return { ok: true, streak: data.streak as Streak };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export default function SadhanaClient() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("mood");
  const [doneToday, setDoneToday] = useState(false);
  const [sloka, setSloka] = useState<Sloka | null>(null);
  const [verseState, setVerseState] = useState<VerseState>("idle");
  const [minutes, setMinutes] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [reflection, setReflection] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectFailed, setReflectFailed] = useState(false);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [logOutcome, setLogOutcome] = useState<LogOutcome | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pathContext, setPathContext] = useState<PathContext | null>(null);
  // "Tomorrow: day N of your path" on the done screen; null when no path is
  // active or the path just finished its last day.
  const [tomorrowDay, setTomorrowDay] = useState<number | null>(null);

  const moodRef = useRef<string | null>(null);
  const verseReqRef = useRef(0);
  // Wall-clock timer: the sit is anchored to real time, not to how often a
  // (possibly throttled, hidden-tab) interval managed to fire.
  const totalSecRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const satMsRef = useRef(0);
  const sitCompletedRef = useRef(false);
  const prevTitleRef = useRef<string | null>(null);
  const flowBodyRef = useRef<Record<string, unknown> | null>(null);
  const pathBootstrappedRef = useRef(false);

  const signedIn = Boolean(user && !user.is_anonymous);
  // finishFlow reads these through refs so its useCallback identity does not
  // have to chase auth or query-param state.
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  const pathContextRef = useRef<PathContext | null>(null);
  pathContextRef.current = pathContext;

  useEffect(() => {
    const tz = deviceTimezone();
    fetch(`/api/sadhana${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.doneToday?.includes?.("flow")) setDoneToday(true);
      })
      .catch(() => {});
  }, []);

  // Replay any device-only sessions once a real sign-in exists.
  useEffect(() => {
    if (!user || user.is_anonymous) return;
    const sessions = readDeviceLog();
    if (sessions.length === 0) return;
    fetch("/api/sadhana/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessions, timezone: deviceTimezone() }),
    })
      .then((res) => {
        if (res.ok) clearDeviceLog();
      })
      .catch(() => {});
  }, [user]);

  const loadVerse = useCallback(async (moodId: string) => {
    const req = ++verseReqRef.current;
    setSloka(null);
    setVerseState("loading");
    try {
      const res = await fetch(`/api/moods/${moodId}/slokas`);
      if (!res.ok) throw new Error("verse fetch failed");
      const data = (await res.json()) as { slokas: Sloka[] };
      if (verseReqRef.current !== req) return;
      if (data.slokas?.length) {
        // Stable within the day, different across days.
        const idx = Math.floor(Date.now() / 86_400_000) % data.slokas.length;
        setSloka(data.slokas[idx]);
        setVerseState("loaded");
      } else {
        setVerseState("failed");
      }
    } catch {
      // The sit continues without a verse rather than failing the flow —
      // but the absence is named, not silent (a quiet retry renders).
      if (verseReqRef.current === req) setVerseState("failed");
    }
  }, []);

  const loadVerseById = useCallback(async (id: number) => {
    const req = ++verseReqRef.current;
    setSloka(null);
    setVerseState("loading");
    try {
      const res = await fetch(`/api/slokas/${id}`);
      if (!res.ok) throw new Error("verse fetch failed");
      const data = (await res.json()) as Sloka;
      if (verseReqRef.current !== req) return;
      if (data?.id) {
        setSloka(data);
        setVerseState("loaded");
      } else {
        setVerseState("failed");
      }
    } catch {
      if (verseReqRef.current === req) setVerseState("failed");
    }
  }, []);

  // Path-day deep link (?slokaId&pathId&pathDay&pathTotal&minutes from
  // /paths/[id]): open straight on the sit with that day's verse and remember
  // the path so finishing the flow marks the day on the run.
  useEffect(() => {
    if (pathBootstrappedRef.current) return;
    const slokaId = Number(searchParams.get("slokaId"));
    if (!Number.isInteger(slokaId) || slokaId < 1) return;
    pathBootstrappedRef.current = true;
    const pathId = searchParams.get("pathId");
    const pathDay = Number(searchParams.get("pathDay"));
    const pathTotal = Number(searchParams.get("pathTotal"));
    if (
      pathId &&
      /^[a-z0-9-]+$/i.test(pathId) &&
      Number.isInteger(pathDay) &&
      pathDay >= 1
    ) {
      setPathContext({
        pathId,
        pathDay,
        pathTotal:
          Number.isInteger(pathTotal) && pathTotal >= pathDay && pathTotal <= 60
            ? pathTotal
            : null,
      });
    }
    const mins = Number(searchParams.get("minutes"));
    if (Number.isFinite(mins) && mins >= 1 && mins <= 60) {
      setMinutes(Math.round(mins));
    }
    setStage("sit");
    void loadVerseById(slokaId);
  }, [searchParams, loadVerseById]);

  /**
   * Mark the active path day complete after the practice was recorded —
   * the same write as the path page's "Mark day complete" — and work out
   * whether a "tomorrow" line has a day to point at. Secondary to the
   * practice log: any failure here is silent, the sit still counted.
   */
  const recordPathDay = useCallback(async () => {
    const pc = pathContextRef.current;
    if (!pc) return;
    let nextDay: number | null = null;
    let completedCount = 0;

    const markLocally = () => {
      const days = markGuestPathDay(pc.pathId, pc.pathDay);
      completedCount = days.length;
      const upcoming = (days[days.length - 1] ?? 0) + 1;
      // Without days_count there is no honest clamp — mark, but say nothing.
      nextDay = pc.pathTotal ? Math.min(pc.pathTotal, upcoming) : null;
    };

    if (signedInRef.current) {
      try {
        const res = await fetch(
          `/api/paths/${encodeURIComponent(pc.pathId)}/run`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ day: pc.pathDay }),
          }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            currentDay?: number;
            completedDays?: number[];
          };
          completedCount = data.completedDays?.length ?? 0;
          nextDay = data.currentDay ?? null;
        } else if (res.status === 401) {
          markLocally();
        }
      } catch {
        /* the day can still be marked from the path page */
      }
    } else {
      markLocally();
    }

    const pathDone = pc.pathTotal !== null && completedCount >= pc.pathTotal;
    setTomorrowDay(
      nextDay !== null && nextDay > pc.pathDay && !pathDone ? nextDay : null
    );
  }, []);

  function pickMood(moodId: string) {
    moodRef.current = moodId;
    setStage("sit");
    void loadVerse(moodId);
  }

  const haltClock = useCallback(() => {
    if (segmentStartRef.current !== null) {
      satMsRef.current += Date.now() - segmentStartRef.current;
      segmentStartRef.current = null;
    }
    setRunning(false);
  }, []);

  const restoreTitle = useCallback(() => {
    if (prevTitleRef.current !== null) {
      document.title = prevTitleRef.current;
      prevTitleRef.current = null;
    }
  }, []);

  function begin() {
    totalSecRef.current = minutes * 60;
    satMsRef.current = 0;
    segmentStartRef.current = Date.now();
    sitCompletedRef.current = false;
    setAnnouncement("");
    setSecondsLeft(minutes * 60);
    setRunning(true);
  }

  function togglePause() {
    if (running) {
      haltClock();
    } else {
      segmentStartRef.current = Date.now();
      setRunning(true);
    }
  }

  useEffect(() => {
    if (!running) return;
    const update = () => {
      const elapsedMs =
        satMsRef.current +
        (segmentStartRef.current ? Date.now() - segmentStartRef.current : 0);
      const left = Math.max(
        0,
        totalSecRef.current - Math.floor(elapsedMs / 1000)
      );
      setSecondsLeft(left);
      if (left > 0 || sitCompletedRef.current) return;
      sitCompletedRef.current = true;
      haltClock();
      // A closed-eyes meditator must be able to notice the end without
      // watching the DOM: a short vibration where supported, the tab title,
      // and a polite screen-reader announcement. No audio by design.
      try {
        navigator.vibrate?.(200);
      } catch {
        /* not supported */
      }
      if (prevTitleRef.current === null) prevTitleRef.current = document.title;
      document.title = t("sadhanaSitComplete");
      setAnnouncement(t("sadhanaSitComplete"));
      setStage("sitDone");
    };
    update();
    const id = setInterval(update, 500);
    // Hidden tabs throttle timers; recompute the moment we are visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [running, haltClock, t]);

  // The changed tab title holds until the person is back: restore on their
  // next interaction, or when the held screen is left.
  useEffect(() => {
    if (stage !== "sitDone") return;
    window.addEventListener("pointerdown", restoreTitle, { once: true });
    window.addEventListener("keydown", restoreTitle, { once: true });
    return () => {
      window.removeEventListener("pointerdown", restoreTitle);
      window.removeEventListener("keydown", restoreTitle);
      restoreTitle();
    };
  }, [stage, restoreTitle]);

  const finishFlow = useCallback(async () => {
    const satSec = Math.min(
      86_400,
      Math.max(1, Math.round(satMsRef.current / 1000))
    );
    // One body per completed sit, clientRef included, so a retry after a
    // half-failed request can never double-count server-side.
    const body = flowBodyRef.current ?? {
      practice: "flow",
      durationSec: satSec,
      details: sloka ? { slokaId: sloka.id } : undefined,
      clientRef: newClientRef(),
    };
    flowBodyRef.current = body;
    const result = await logPractice(body);
    if (result.ok) {
      flowBodyRef.current = null;
      setStreak(result.streak);
      setLogOutcome("recorded");
      setDoneToday(true);
      await recordPathDay();
    } else if (result.reason === "signedOut") {
      appendDeviceLog({
        practice: "flow",
        occurredOn: localDayStamp(),
        durationSec: Number(body.durationSec) || satSec,
        clientRef: String(body.clientRef),
      });
      flowBodyRef.current = null;
      setLogOutcome("deviceOnly");
      await recordPathDay();
    } else {
      setLogOutcome("failed");
    }
    setStage("done");
  }, [sloka, recordPathDay]);

  async function retryLog() {
    setRetrying(true);
    await finishFlow();
    setRetrying(false);
  }

  async function saveReflection() {
    const text = reflection.trim();
    if (!sloka || !text) {
      await finishFlow();
      return;
    }
    setSavingReflection(true);
    setReflectFailed(false);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slokaId: sloka.id, reflection: text }),
      });
      if (!res.ok) throw new Error("journal save failed");
      await finishFlow();
    } catch {
      // The line stays in the textarea; nothing pretends it was kept.
      setReflectFailed(true);
    } finally {
      setSavingReflection(false);
    }
  }

  function resetFlow() {
    setStage("mood");
    setSloka(null);
    setVerseState("idle");
    setSecondsLeft(null);
    setRunning(false);
    setReflection("");
    setReflectFailed(false);
    setStreak(null);
    setLogOutcome(null);
    setAnnouncement("");
    // A fresh sit is its own practice — never re-marks the arrival path day.
    setPathContext(null);
    setTomorrowDay(null);
    flowBodyRef.current = null;
    satMsRef.current = 0;
    segmentStartRef.current = null;
    sitCompletedRef.current = false;
    restoreTitle();
  }

  const translation =
    lang === "hi" ? sloka?.hindi_translation : sloka?.english_translation;

  return (
    <div className="max-w-2xl">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {doneToday && stage === "mood" ? (
        <p className="mb-8 border-l-2 border-[var(--brass)]/60 pl-4 text-[15px] text-[var(--text-muted)]">
          {t("sadhanaDoneToday")} · {t("sadhanaAgain")} ↓
        </p>
      ) : null}

      {stage === "mood" ? (
        <section>
          <h2 className="font-display text-2xl text-[var(--text)]">
            {t("sadhanaMoodPrompt")}
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {moods.map((mood) => (
              <button
                key={mood.id}
                type="button"
                onClick={() => pickMood(mood.id)}
                className="min-h-10 border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
              >
                {lang === "hi" ? mood.labelHi : mood.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {stage === "sit" ? (
        <section>
          {verseState === "loading" ? (
            <div className="mb-8 border-l-2 border-[var(--hairline)] pl-5" aria-hidden>
              <div className="h-3 w-40 animate-pulse bg-[var(--hairline)]" />
              <div className="mt-4 h-5 w-full max-w-md animate-pulse bg-[var(--hairline)]" />
              <div className="mt-2 h-5 w-2/3 animate-pulse bg-[var(--hairline)]" />
            </div>
          ) : sloka ? (
            <div className="mb-8 border-l-2 border-[var(--brass)]/50 pl-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {t("sadhanaVersePrompt")} · {sloka.chapter}.{sloka.verse_number}
              </p>
              <p className="mt-3 font-display text-xl leading-relaxed text-[var(--text)]">
                {splitVerseLines(sloka.sanskrit_devanagari).slice(0, 2).join(" ")}
              </p>
              {translation ? (
                <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
                  {translation}
                </p>
              ) : null}
              <Link
                href={`/sloka/${sloka.id}`}
                className="mt-3 inline-block text-sm text-[var(--brass-soft)] hover:underline"
              >
                {t("sadhanaOpenVerse")} →
              </Link>
            </div>
          ) : verseState === "failed" ? (
            <div className="mb-8 border-l-2 border-[var(--hairline)] pl-5">
              <p className="text-sm font-light text-[var(--text-soft)]">
                {t("sadhanaVerseFailed")}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (moodRef.current) void loadVerse(moodRef.current);
                }}
                className="mt-2 inline-flex min-h-10 items-center px-3 py-2 text-sm text-[var(--brass-soft)] underline-offset-4 hover:underline"
              >
                {t("sadhanaRetry")}
              </button>
            </div>
          ) : null}

          {secondsLeft === null ? (
            <div>
              <h2 className="font-display text-2xl text-[var(--text)]">
                {t("sadhanaTimerPrompt")}
              </h2>
              <div className="mt-5 flex items-center gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMinutes(n)}
                    className={`min-h-10 border px-4 py-2 text-sm transition ${
                      minutes === n
                        ? "border-[var(--brass)] text-[var(--brass-soft)]"
                        : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/50"
                    }`}
                  >
                    {t("sadhanaMin").replace("{n}", String(n))}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={begin}
                className="mt-6 min-h-11 bg-[var(--brass)] px-8 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("sadhanaBegin")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <div
                className="flex h-48 w-48 items-center justify-center rounded-full border border-[var(--brass)]/40"
                style={{ animation: "field-breathe 14s ease-in-out infinite" }}
              >
                <span className="font-display text-4xl tabular-nums text-[var(--text)]">
                  {Math.floor(secondsLeft / 60)}:
                  {String(secondsLeft % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePause}
                  className="min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50"
                >
                  {running ? t("sadhanaPause") : t("sadhanaResume")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haltClock();
                    setStage("reflect");
                  }}
                  className="min-h-10 px-3 py-2 text-sm text-[var(--text-muted)] underline-offset-4 hover:text-[var(--brass-soft)] hover:underline"
                >
                  {t("sadhanaFinishEarly")}
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {stage === "sitDone" ? (
        // Held completion screen: the flow waits for the person, it does not
        // swap a textarea in under closed eyes.
        <section className="flex flex-col items-center py-10 text-center">
          <p className="font-display text-2xl text-[var(--text)]">
            {t("sadhanaSitComplete")}
          </p>
          <button
            type="button"
            onClick={() => {
              restoreTitle();
              setAnnouncement("");
              setStage("reflect");
            }}
            className="mt-8 min-h-11 bg-[var(--brass)] px-8 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            {t("sadhanaContinue")}
          </button>
        </section>
      ) : null}

      {stage === "reflect" ? (
        <section>
          <h2 className="font-display text-2xl text-[var(--text)]">
            {t("sadhanaReflectPrompt")}
          </h2>
          {signedIn && sloka ? (
            <>
              <textarea
                value={reflection}
                onChange={(e) => {
                  setReflection(e.target.value);
                  setReflectFailed(false);
                }}
                placeholder={t("sadhanaReflectPlaceholder")}
                rows={3}
                className="mt-5 w-full border border-[var(--line)] bg-transparent px-4 py-3 text-[15px] text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--brass)]/60 focus:outline-none"
              />
              {reflectFailed ? (
                <p className="mt-3 border-l-2 border-[var(--brass)]/60 pl-3 text-sm text-[var(--text-soft)]">
                  {t("sadhanaReflectFailed")}
                </p>
              ) : null}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  disabled={savingReflection}
                  onClick={() => void saveReflection()}
                  className="min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
                >
                  {t("sadhanaSaveReflection")}
                </button>
                <button
                  type="button"
                  disabled={savingReflection}
                  onClick={() => void finishFlow()}
                  className="min-h-11 px-3 py-3 text-sm text-[var(--text-muted)] underline-offset-4 hover:text-[var(--brass-soft)] hover:underline disabled:opacity-50"
                >
                  {t("sadhanaSkipReflection")}
                </button>
              </div>
            </>
          ) : (
            <>
              {!signedIn ? (
                // No writable journal here — inviting a line and then
                // discarding it would be worse than asking to sign in.
                <p className="mt-4 text-[15px] text-[var(--text-muted)]">
                  {t("sadhanaSignInHint")}{" "}
                  <Link
                    href="/account"
                    className="text-[var(--brass-soft)] hover:underline"
                  >
                    {t("signIn")}
                  </Link>
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void finishFlow()}
                className="mt-6 min-h-11 bg-[var(--brass)] px-8 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                {t("sadhanaContinue")}
              </button>
            </>
          )}
        </section>
      ) : null}

      {stage === "done" ? (
        <section className="py-4">
          <p className="font-display text-2xl text-[var(--text)]">
            {t("sadhanaComplete")}
          </p>

          {logOutcome === "recorded" && streak ? (
            <p className="mt-3 text-[15px] text-[var(--text-muted)]">
              {t("sadhanaStreakLine").replace("{n}", String(streak.current))}
              {streak.graceUsedToday ? (
                <span className="mt-1 block">{t("sadhanaGrace")}</span>
              ) : null}
            </p>
          ) : null}

          {tomorrowDay !== null && pathContext ? (
            <p className="mt-3 text-[15px] text-[var(--text-soft)]">
              <Link
                href={`/paths/${pathContext.pathId}`}
                className="text-[var(--brass-soft)] underline-offset-4 hover:underline"
              >
                {t("sadhanaTomorrowPath").replace("{n}", String(tomorrowDay))} →
              </Link>
            </p>
          ) : null}

          {logOutcome === "deviceOnly" ? (
            <p className="mt-3 text-[15px] text-[var(--text-soft)]">
              {t("sadhanaDeviceOnly")}{" "}
              <Link
                href="/account"
                className="text-[var(--brass-soft)] hover:underline"
              >
                {t("signIn")}
              </Link>
            </p>
          ) : null}

          {logOutcome === "failed" ? (
            <div className="mt-3">
              <p className="border-l-2 border-[var(--brass)]/60 pl-3 text-[15px] text-[var(--text-soft)]">
                {t("sadhanaLogFailed")}
              </p>
              <button
                type="button"
                disabled={retrying}
                onClick={() => void retryLog()}
                className="mt-4 min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 disabled:opacity-50"
              >
                {t("sadhanaRetry")}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={resetFlow}
            className="mt-6 min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50"
          >
            {t("sadhanaAgain")}
          </button>
        </section>
      ) : null}

      <JapaPanel visible={stage === "mood" || stage === "done"} />
    </div>
  );
}

function JapaPanel({ visible }: { visible: boolean }) {
  const { lang, t } = useLanguage();
  const [beads, setBeads] = useState(0);
  const [malas, setMalas] = useState(0);
  const [mantras, setMantras] = useState<
    Array<{ id: string; devanagari: string; iast: string; meaning_en: string; meaning_hi: string }>
  >([]);
  const [mantraIdx, setMantraIdx] = useState(0);
  const [outcome, setOutcome] = useState<
    null | "logged" | "deviceOnly" | "failed"
  >(null);
  const [busy, setBusy] = useState(false);
  // Space only counts beads once the circle has been touched or focused —
  // never as a global shortcut leaking into someone's sit or reflection.
  const [engaged, setEngaged] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tick, setTick] = useState(false);
  const japaBodyRef = useRef<Record<string, unknown> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    import("@/data/mantras.json")
      .then((mod) => setMantras(mod.default))
      .catch(() => {});
  }, []);

  const tap = useCallback(() => {
    setEngaged(true);
    setOutcome(null);
    japaBodyRef.current = null; // a changed count is a new attempt
    setBeads((b) => {
      if (b + 1 >= 108) {
        setMalas((m) => m + 1);
        return 0;
      }
      return b + 1;
    });
    setTick(true);
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
    tickTimerRef.current = setTimeout(() => setTick(false), 120);
    try {
      navigator.vibrate?.(8);
    } catch {
      /* haptic optional */
    }
  }, []);

  useEffect(() => {
    return () => {
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
    };
  }, []);

  // The shortcut must never steal Space from another focused control: a
  // keyboard user who tabbed to "Sit again" and pressed Space should activate
  // that button, not count a phantom bead. Only document-body (no focus) or
  // the japa circle itself count.
  useEffect(() => {
    if (!visible) {
      setEngaged(false);
      return;
    }
    if (!(engaged || focused)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const el = e.target as HTMLElement | null;
      const onInteractive = el?.closest?.(
        "button, a, input, select, textarea, [role='button']"
      );
      if (onInteractive && !el?.dataset?.japaCircle) return;
      e.preventDefault();
      tap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap, visible, engaged, focused]);

  async function finishJapa() {
    const total = malas * 108 + beads;
    const body =
      japaBodyRef.current ??
      (total > 0
        ? { practice: "japa", count: total, clientRef: newClientRef() }
        : null);
    if (!body) return;
    japaBodyRef.current = body;
    setBusy(true);
    const result = await logPractice(body);
    setBusy(false);
    if (result.ok) {
      japaBodyRef.current = null;
      setBeads(0);
      setMalas(0);
      setOutcome("logged");
    } else if (result.reason === "signedOut") {
      appendDeviceLog({
        practice: "japa",
        occurredOn: localDayStamp(),
        count: Number(body.count) || total,
        clientRef: String(body.clientRef),
      });
      japaBodyRef.current = null;
      setBeads(0);
      setMalas(0);
      setOutcome("deviceOnly");
    } else {
      // The count stays on the circle — nothing is reset on a failed record.
      setOutcome("failed");
    }
  }

  const mantra = mantras[mantraIdx];

  return (
    <section
      hidden={!visible}
      className="mt-16 border-t border-[var(--hairline)] pt-10"
    >
      <h2 className="font-display text-2xl text-[var(--text)]">
        {t("japaTitle")}
      </h2>
      <p className="mt-2 text-[15px] font-light text-[var(--text-muted)]">
        {t("japaIntro")}
      </p>

      {mantra ? (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("japaMantra")}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="font-display text-xl text-[var(--text)]">
              {mantra.devanagari}
            </p>
            <button
              type="button"
              onClick={() => setMantraIdx((i) => (i + 1) % mantras.length)}
              className="text-sm text-[var(--brass-soft)] hover:underline"
            >
              ↻
            </button>
          </div>
          <p className="mt-1 text-sm font-light text-[var(--text-muted)]">
            {lang === "hi" ? mantra.meaning_hi : mantra.meaning_en}
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col items-center">
        <button
          type="button"
          onClick={tap}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={t("japaTitle")}
          data-japa-circle="1"
          className="flex h-56 w-56 items-center justify-center rounded-full border border-[var(--brass)]/40 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)]/60"
        >
          <span
            className={`font-display text-5xl tabular-nums text-[var(--text)] transition duration-100 ${
              tick ? "scale-110" : "scale-100"
            }`}
          >
            {beads}
            <span className="text-xl text-[var(--text-muted)]"> / 108</span>
          </span>
        </button>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          {malas} {t("japaMalas")}
        </p>
        {malas > 0 || beads > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void finishJapa()}
            className="mt-4 min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 disabled:opacity-50"
          >
            {t("japaFinish")}
          </button>
        ) : null}
        {outcome === "logged" ? (
          <p className="mt-3 text-sm text-[var(--brass-soft)]">{t("japaLogged")}</p>
        ) : null}
        {outcome === "deviceOnly" ? (
          <p className="mt-3 text-sm text-[var(--text-soft)]">
            {t("sadhanaDeviceOnly")}{" "}
            <Link
              href="/account"
              className="text-[var(--brass-soft)] hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        ) : null}
        {outcome === "failed" ? (
          <div className="mt-3 text-center">
            <p className="text-sm text-[var(--text-soft)]">
              {t("sadhanaLogFailed")}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finishJapa()}
              className="mt-2 text-sm text-[var(--brass-soft)] underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t("sadhanaRetry")}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
