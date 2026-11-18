"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { finishMeditationSit } from "@/lib/finish-meditation-sit";
import type { SleepTrack } from "@/lib/meditation-audio";

const CHOICES = [15, 30, 45, "full"] as const;

function clock(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SleepBedClient({ track }: { track: SleepTrack }) {
  const { lang, t } = useLanguage();
  const [choice, setChoice] = useState<(typeof CHOICES)[number]>(30);
  const [stage, setStage] = useState<"setup" | "play" | "mood" | "done">("setup");
  const [left, setLeft] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [line, setLine] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const touched = useRef(false);
  const totalRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const plannedSec = () =>
    choice === "full" ? track.durationSec : Math.min(choice * 60, track.durationSec);

  const begin = () => {
    touched.current = false;
    const total = plannedSec();
    totalRef.current = total;
    setLeft(total);
    const el = new Audio(track.src);
    el.loop = false;
    el.volume = 0.7;
    audioRef.current = el;
    void el.play().catch(() => undefined);
    setStage("play");
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const remain = total - elapsed;
      setLeft(remain);
      const fade = 15;
      if (remain <= fade) {
        el.volume = Math.max(0, (remain / fade) * 0.7);
      }
      if (remain <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        el.pause();
        setStage(touched.current ? "mood" : "done");
        if (!touched.current) void save(false);
      }
    }, 250);
  };

  const save = async (askMood: boolean) => {
    const stats = await finishMeditationSit({
      sessionId: `sleep-bed-${track.id}-${choice}`,
      durationSec: totalRef.current,
      moodAfter: askMood ? mood : null,
    });
    setLine(
      t("medCloseLine")
        .replace("{min}", String(stats.dayMinutes))
        .replace("{sits}", String(stats.lifetimeSits))
    );
    setStage("done");
  };

  const title = lang === "hi" ? track.title_hi : track.title_en;

  return (
    <div
      className="mx-auto max-w-lg px-4 py-10"
      onPointerDown={() => {
        if (stage === "play") touched.current = true;
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">{t("medSleepTonight")}</p>
      <h1 className="mt-3 font-display text-4xl text-[var(--text)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{track.credit} · {track.license}</p>
      {stage === "setup" ? (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {CHOICES.map((c) => (
              <button
                key={String(c)}
                type="button"
                onClick={() => setChoice(c)}
                className={`min-h-11 border px-3 ${choice === c ? "border-[var(--brass)] text-[var(--brass-soft)]" : "border-[var(--line)]"}`}
              >
                {c === "full" ? "full" : `${c}`}
              </button>
            ))}
          </div>
          <button type="button" onClick={begin} className="mt-8 min-h-11 bg-[var(--brass)] px-6 py-3 text-[var(--on-brass)]">
            {t("medBeginSit")}
          </button>
        </>
      ) : null}
      {stage === "play" ? <p className="mt-10 font-display text-7xl tabular-nums">{clock(left)}</p> : null}
      {stage === "mood" ? (
        <div className="mt-8">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setMood(n)} className={`min-h-11 min-w-11 border ${mood === n ? "border-[var(--brass)]" : "border-[var(--line)]"}`}>
                {n}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void save(true)} className="mt-6 min-h-11 bg-[var(--brass)] px-6 py-3 text-[var(--on-brass)]">
            {t("medComplete")}
          </button>
        </div>
      ) : null}
      {stage === "done" ? (
        <div className="mt-8">
          <p className="text-lg">{line}</p>
          <Link href="/meditation" className="mt-6 inline-block text-[var(--brass-soft)]">{t("medBack")}</Link>
        </div>
      ) : null}
    </div>
  );
}
