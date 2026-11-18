"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { finishMeditationSit } from "@/lib/finish-meditation-sit";
import { markSleepEvening, readSleepEvenings } from "@/lib/meditation-stats";
import type { MeditationSession } from "@/lib/meditation-core";

export default function SleepEveningClient({
  session,
}: {
  session: MeditationSession;
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [stage, setStage] = useState<"read" | "play" | "mood" | "done">("read");
  const [line, setLine] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const touched = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      audioRef.current?.pause();
    };
    if (!user) {
      const done = readSleepEvenings();
      setLocked(session.day_number > 1 && !done.includes(session.day_number - 1));
      return finish;
    }
    void fetch("/api/meditation/progress?program=sleep-7")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { completedDays?: number[] } | null) => {
        if (cancelled) return;
        const done = Array.isArray(data?.completedDays) ? data.completedDays : [];
        setLocked(session.day_number > 1 && !done.includes(session.day_number - 1));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      finish();
    };
  }, [session.day_number, user]);

  const speaks = session.phases.filter((p) => p.type === "speak");
  const title = lang === "hi" ? session.title_hi : session.title_en;

  const begin = () => {
    if (!session.audio_url) return;
    touched.current = false;
    const total = session.duration_minutes * 60;
    const el = new Audio(session.audio_url);
    audioRef.current = el;
    el.volume = 0.55;
    void el.play().catch(() => undefined);
    setStage("play");
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      const remain = total - Math.floor((Date.now() - started) / 1000);
      if (remain <= 15) el.volume = Math.max(0, (remain / 15) * 0.55);
      if (remain <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        el.pause();
        if (touched.current) setStage("mood");
        else void save(false);
      }
    }, 250);
  };

  const save = async (askMood: boolean) => {
    const stats = await finishMeditationSit({
      sessionId: session.id,
      durationSec: session.duration_minutes * 60,
      moodAfter: askMood ? mood : null,
    });
    markSleepEvening(session.day_number);
    setLine(
      t("medCloseLine")
        .replace("{min}", String(stats.dayMinutes))
        .replace("{sits}", String(stats.lifetimeSits))
    );
    setStage("done");
  };

  if (locked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-[var(--text)]">{t("medDayLocked")}</p>
        <Link href={`/meditation/sleep/${session.day_number - 1}`} className="mt-4 inline-block text-[var(--brass-soft)]">
          {t("medSevenEvenings")}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-lg px-4 py-10"
      onPointerDown={() => {
        if (stage === "play") touched.current = true;
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
        {t("medSevenEvenings")} · {session.day_number}
      </p>
      <h1 className="mt-3 font-display text-4xl">{title}</h1>
      {stage === "read" ? (
        <>
          <div className="mt-6 space-y-4 text-[var(--text)]">
            {speaks.map((p, i) => (
              <p key={i}>{lang === "hi" && p.type === "speak" ? p.text_hi : p.type === "speak" ? p.text_en : ""}</p>
            ))}
          </div>
          <button type="button" onClick={begin} className="mt-8 min-h-11 bg-[var(--brass)] px-6 py-3 text-[var(--on-brass)]">
            {t("medBeginSit")}
          </button>
        </>
      ) : null}
      {stage === "play" ? <p className="mt-10 text-[var(--text-muted)]">{t("medListeningHint")}</p> : null}
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
          <p>{line}</p>
          {session.day_number < 7 ? (
            <Link href={`/meditation/sleep/${session.day_number + 1}`} className="mt-4 inline-block text-[var(--brass-soft)]">
              {session.day_number + 1}
            </Link>
          ) : null}
          <Link href="/meditation" className="mt-4 block text-[var(--brass-soft)]">{t("medBack")}</Link>
        </div>
      ) : null}
    </div>
  );
}
