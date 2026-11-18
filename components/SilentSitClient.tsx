"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { playSoftBell, startAmbient, stopAmbient, type AmbientBed } from "@/lib/audio/ambient";
import { finishMeditationSit } from "@/lib/finish-meditation-sit";
import {
  SILENT_PRESETS,
  readSilentSetup,
  writeSilentSetup,
  type SilentSetup,
} from "@/lib/meditation-stats";

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SilentSitClient() {
  const { t } = useLanguage();
  const [setup, setSetup] = useState<SilentSetup>({ minutes: 10, bed: "rain", intervalMin: 0 });
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<"setup" | "play" | "mood" | "done">("setup");
  const [left, setLeft] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [line, setLine] = useState("");
  const leftRef = useRef(0);
  const totalRef = useRef(0);

  useEffect(() => {
    const saved = readSilentSetup();
    setSetup(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (stage !== "play") return;
    let lock: WakeLockSentinel | null = null;
    void navigator.wakeLock?.request("screen").then((s) => {
      lock = s;
    }).catch(() => undefined);
    const id = window.setInterval(() => {
      const next = leftRef.current - 1;
      leftRef.current = next;
      setLeft(next);
      const elapsed = totalRef.current - next;
      if (
        setup.intervalMin > 0 &&
        elapsed > 0 &&
        elapsed % (setup.intervalMin * 60) === 0 &&
        next > 0
      ) {
        void playSoftBell();
      }
      if (next <= 0) {
        window.clearInterval(id);
        stopAmbient();
        void playSoftBell();
        setStage("mood");
      }
    }, 1000);
    return () => {
      window.clearInterval(id);
      void lock?.release();
    };
  }, [stage, setup.intervalMin]);

  useEffect(() => () => stopAmbient(), []);

  const begin = () => {
    writeSilentSetup(setup);
    const total = setup.minutes * 60;
    totalRef.current = total;
    leftRef.current = total;
    setLeft(total);
    setStage("play");
    void playSoftBell();
    void startAmbient(0.08, setup.bed);
  };

  const save = async () => {
    const stats = await finishMeditationSit({
      sessionId: `silent-${setup.minutes}`,
      durationSec: totalRef.current,
      moodAfter: mood,
    });
    setLine(
      t("medCloseLine")
        .replace("{min}", String(stats.dayMinutes))
        .replace("{sits}", String(stats.lifetimeSits))
    );
    setStage("done");
  };

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
        {t("medSilentTimer")}
      </p>
      {stage === "setup" ? (
        <>
          <h1 className="mt-3 font-display text-4xl text-[var(--text)]">{t("medSitAgain").replace("{n}", String(setup.minutes))}</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            {SILENT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSetup({ ...setup, minutes: n })}
                className={`min-h-11 min-w-11 border px-3 ${setup.minutes === n ? "border-[var(--brass)] text-[var(--brass-soft)]" : "border-[var(--line)] text-[var(--text)]"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["off", "drone", "bowls", "rain"] as AmbientBed[]).map((bed) => (
              <button
                key={bed}
                type="button"
                onClick={() => setSetup({ ...setup, bed })}
                className={`min-h-11 border px-3 capitalize ${setup.bed === bed ? "border-[var(--brass)] text-[var(--brass-soft)]" : "border-[var(--line)]"}`}
              >
                {bed}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            {([0, 5, 10] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSetup({ ...setup, intervalMin: n })}
                className={`min-h-11 border px-3 ${setup.intervalMin === n ? "border-[var(--brass)] text-[var(--brass-soft)]" : "border-[var(--line)]"}`}
              >
                {n === 0 ? "—" : `${n}m`}
              </button>
            ))}
          </div>
          <button type="button" onClick={begin} className="mt-8 min-h-11 bg-[var(--brass)] px-6 py-3 text-[var(--on-brass)]">
            {t("medBeginSit")}
          </button>
        </>
      ) : null}
      {stage === "play" ? (
        <p className="mt-10 font-display text-7xl tabular-nums text-[var(--text)]">{clock(left)}</p>
      ) : null}
      {stage === "mood" ? (
        <div className="mt-8">
          <p className="text-[var(--text)]">{t("medMoodAfter")}</p>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setMood(n)} className={`min-h-11 min-w-11 border ${mood === n ? "border-[var(--brass)]" : "border-[var(--line)]"}`}>
                {n}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void save()} className="mt-6 min-h-11 bg-[var(--brass)] px-6 py-3 text-[var(--on-brass)]">
            {t("medComplete")}
          </button>
        </div>
      ) : null}
      {stage === "done" ? (
        <div className="mt-8">
          <p className="text-lg text-[var(--text)]">{line}</p>
          <Link href="/meditation" className="mt-6 inline-block text-[var(--brass-soft)]">{t("medBack")}</Link>
        </div>
      ) : null}
    </div>
  );
}
