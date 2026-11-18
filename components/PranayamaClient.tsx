"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImmersiveHero from "@/components/ImmersiveHero";
import { useLanguage } from "@/components/LanguageProvider";
import { MilestoneLine, takeNewMilestone } from "@/components/MilestoneMarks";
import type { Milestone } from "@/lib/milestones";
import type { DictKey } from "@/lib/i18n/dictionary";
import {
  appendDeviceLog,
  localDayStamp,
  logPractice,
  newClientRef,
} from "@/lib/sadhana-device-log";

const MIN_SCALE = 0.55;
const RING_PX = 240;

type StepKey = "inhale" | "holdIn" | "exhale" | "holdOut";
type Step = {
  key: StepKey;
  sec: number;
  scaleTo: number;
  labelKey: DictKey;
};

type PatternId = "box" | "calm478" | "even";
const PATTERNS: Record<PatternId, [number, number, number, number]> = {
  box: [4, 4, 4, 4],
  calm478: [4, 7, 8, 0],
  even: [5, 0, 5, 0],
};
const PATTERN_ORDER: PatternId[] = ["box", "calm478", "even"];
const DURATIONS = [2, 5, 10] as const;

const STEP_META: Array<Omit<Step, "sec">> = [
  { key: "inhale", scaleTo: 1, labelKey: "pranaInhale" },
  { key: "holdIn", scaleTo: 1, labelKey: "pranaHoldIn" },
  { key: "exhale", scaleTo: MIN_SCALE, labelKey: "pranaExhale" },
  { key: "holdOut", scaleTo: MIN_SCALE, labelKey: "pranaHoldOut" },
];

function buildSteps(pattern: PatternId): Step[] {
  return PATTERNS[pattern]
    .map((sec, i) => ({ ...STEP_META[i], sec }))
    .filter((s) => s.sec > 0);
}

export default function PranayamaClient() {
  const { t } = useLanguage();
  const [stage, setStage] = useState<"setup" | "breathe" | "done">("setup");
  const [pattern, setPattern] = useState<PatternId>("box");
  const [minutes, setMinutes] = useState<(typeof DURATIONS)[number]>(5);
  const [stepIdx, setStepIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const [ringScale, setRingScale] = useState(MIN_SCALE);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [logNote, setLogNote] = useState<"logged" | "deviceOnly" | null>(null);

  const stepIdxRef = useRef(0);
  const elapsedRef = useRef(0);
  const breathsRef = useRef(0);
  const targetRef = useRef(minutes * 60);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const loggedRef = useRef(false);
  const clientRefRef = useRef(newClientRef());

  const steps = useMemo(() => buildSteps(pattern), [pattern]);

  const clearTimers = useCallback(() => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    stepTimer.current = null;
    tickTimer.current = null;
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const logSession = useCallback(async () => {
    if (loggedRef.current) return;
    const durationSec = startedAtRef.current
      ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      : elapsedRef.current;
    if (durationSec <= 0) return;
    loggedRef.current = true;

    const body = {
      practice: "pranayama",
      durationSec,
      clientRef: clientRefRef.current,
    };

    const result = await logPractice(body);
    if (result.ok) {
      setLogNote("logged");
    } else if (result.reason === "signedOut") {
      appendDeviceLog({
        practice: "pranayama",
        occurredOn: localDayStamp(),
        durationSec,
        clientRef: clientRefRef.current,
      });
      setLogNote("deviceOnly");
    }
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    void logSession();
    void takeNewMilestone().then(setMilestone);
    setStage("done");
  }, [clearTimers, logSession]);

  useEffect(() => {
    if (stage !== "breathe") return;
    const step = steps[stepIdx];
    if (!step) return;

    if (step.key === "inhale") {
      breathsRef.current += 1;
      setBreaths(breathsRef.current);
    }

    setRingScale(step.scaleTo);

    let left = step.sec;
    setSecLeft(left);
    tickTimer.current = setInterval(() => {
      left -= 1;
      setSecLeft(Math.max(0, left));
    }, 1000);

    stepTimer.current = setTimeout(() => {
      if (tickTimer.current) clearInterval(tickTimer.current);
      elapsedRef.current += step.sec;
      if (elapsedRef.current >= targetRef.current) {
        finish();
        return;
      }
      const next = (stepIdxRef.current + 1) % steps.length;
      stepIdxRef.current = next;
      setStepIdx(next);
    }, step.sec * 1000);

    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [stage, stepIdx, steps, finish]);

  function begin() {
    targetRef.current = minutes * 60;
    elapsedRef.current = 0;
    breathsRef.current = 0;
    stepIdxRef.current = 0;
    loggedRef.current = false;
    clientRefRef.current = newClientRef();
    startedAtRef.current = Date.now();
    setRingScale(MIN_SCALE);
    setBreaths(0);
    setStepIdx(0);
    setMilestone(null);
    setLogNote(null);
    setStage("breathe");
  }

  function stopEarly() {
    finish();
  }

  function closeDone() {
    setStage("setup");
    setLogNote(null);
    setMilestone(null);
  }

  const step = steps[stepIdx];
  const patternLabel = (id: PatternId) =>
    id === "box"
      ? t("pranaPatternBox")
      : id === "calm478"
        ? t("pranaPattern478")
        : t("pranaPatternEven");
  const patternHint = (id: PatternId) =>
    id === "box"
      ? t("pranaPatternBoxHint")
      : id === "calm478"
        ? t("pranaPattern478Hint")
        : t("pranaPatternEvenHint");
  const patternSteps = (id: PatternId) =>
    id === "box"
      ? t("pranaPatternBoxSteps")
      : id === "calm478"
        ? t("pranaPattern478Steps")
        : t("pranaPatternEvenSteps");

  if (stage === "done") {
    return (
      <div className="life-hub pb-10">
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
          <p className="eyebrow text-[var(--brass)]">{t("pranaDone")}</p>
          <h1 className="mt-2 font-display text-3xl text-[var(--brass-soft)]">
            {t("pranaTitle")}
          </h1>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("pranaBreathsDone")
              .replace("{n}", String(breaths))
              .replace("{min}", String(minutes))}
          </p>
          <p className="mt-4 text-[15px] font-light text-[var(--text-muted)]">
            {t("pranaDoneBody")}
          </p>
          {milestone ? <MilestoneLine milestone={milestone} /> : null}
          {logNote === "deviceOnly" ? (
            <p className="mt-4 text-sm text-[var(--text-soft)]">
              {t("sadhanaDeviceOnly")}{" "}
              <Link href="/account" className="text-[var(--brass-soft)] hover:underline">
                {t("signIn")}
              </Link>
            </p>
          ) : null}
          <button
            type="button"
            onClick={closeDone}
            className="mt-8 min-h-11 bg-[var(--brass)] px-6 py-2 text-sm font-medium text-[var(--on-brass)]"
          >
            {t("pranaClose")}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "breathe") {
    return (
      <div className="life-hub pb-10">
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-10">
          <p className="eyebrow text-[var(--brass)]">
            {t("pranaBreaths").replace("{n}", String(breaths))}
          </p>
          <div
            className="relative mt-10 flex items-center justify-center"
            style={{ width: RING_PX, height: RING_PX }}
            aria-live="polite"
          >
            <div
              className="absolute rounded-full border border-[var(--line)] opacity-50"
              style={{ width: RING_PX, height: RING_PX }}
            />
            <div
              className="absolute rounded-full border-2 border-[var(--brass)] bg-[var(--atmosphere-brass)] transition-transform ease-in-out"
              style={{
                width: RING_PX,
                height: RING_PX,
                transform: `scale(${ringScale})`,
                transitionDuration: `${step?.sec ?? 1}s`,
              }}
            />
            <div className="relative flex flex-col items-center justify-center">
              <p className="font-display text-xl text-[var(--brass-soft)]">
                {step ? t(step.labelKey) : ""}
              </p>
              <p className="mt-1 font-display text-5xl tabular-nums text-[var(--brass-soft)]">
                {secLeft}
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
            {t("pranaTapHint")}
          </p>
          <button
            type="button"
            onClick={stopEarly}
            className="mt-6 min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50"
          >
            {t("pranaFinish")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="life-hub pb-10">
      <ImmersiveHero
        image="/images/paths/meditation.jpg"
        eyebrow={t("pranaEyebrow")}
        title={t("pranaTitle")}
        intro={t("pranaIntro")}
        actions={
          <Link
            href="/meditation"
            className="inline-flex min-h-12 items-center border border-white/25 px-5 py-3 text-sm text-white/80 transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
          >
            {t("homeMeditationTitle")}
          </Link>
        }
      />
      <div className="life-hub__panel max-w-2xl">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {t("pranaPatternLabel")}
        </p>
        <ul className="mt-3 space-y-2">
          {PATTERN_ORDER.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => setPattern(p)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  pattern === p
                    ? "border-[var(--brass)] bg-[var(--surface-hover)]"
                    : "border-[var(--line)] hover:bg-[var(--surface-hover)]/50"
                }`}
              >
                <p className="text-[var(--text)]">{patternLabel(p)}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {patternHint(p)}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {t("pranaHowToLabel")}
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed text-[var(--text-muted)]">
          {patternSteps(pattern)}
        </p>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {t("pranaDurationLabel")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={`min-h-10 border px-4 py-2 text-sm ${
                minutes === m
                  ? "border-[var(--brass)] text-[var(--brass-soft)]"
                  : "border-[var(--line)] text-[var(--text-muted)]"
              }`}
            >
              {t("pranaMin").replace("{n}", String(m))}
            </button>
          ))}
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {t("pranaSafetyLabel")}
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t("pranaSafety")}</p>

        <button
          type="button"
          onClick={begin}
          className="mt-8 min-h-11 bg-[var(--brass)] px-6 py-2 text-sm font-medium text-[var(--on-brass)]"
        >
          {t("pranaBegin")}
        </button>
      </div>
    </div>
  );
}