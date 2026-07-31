"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { moods } from "@/lib/moods-data";
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

type Stage = "mood" | "sit" | "reflect" | "done";

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

async function logPractice(body: Record<string, unknown>): Promise<
  { ok: true; streak: Streak } | { ok: false; signedOut: boolean }
> {
  try {
    const res = await fetch("/api/sadhana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        clientRef: newClientRef(),
        timezone: deviceTimezone(),
      }),
    });
    if (res.status === 401) return { ok: false, signedOut: true };
    if (!res.ok) return { ok: false, signedOut: false };
    const data = await res.json();
    return { ok: true, streak: data.streak as Streak };
  } catch {
    return { ok: false, signedOut: false };
  }
}

export default function SadhanaClient() {
  const { lang, t } = useLanguage();
  const [stage, setStage] = useState<Stage>("mood");
  const [doneToday, setDoneToday] = useState(false);
  const [sloka, setSloka] = useState<Sloka | null>(null);
  const [minutes, setMinutes] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [reflection, setReflection] = useState("");
  const [streak, setStreak] = useState<Streak | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const tz = deviceTimezone();
    fetch(`/api/sadhana${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.doneToday?.includes?.("flow")) setDoneToday(true);
      })
      .catch(() => {});
  }, []);

  async function pickMood(moodId: string) {
    setSloka(null);
    setStage("sit");
    try {
      const res = await fetch(`/api/moods/${moodId}/slokas`);
      if (res.ok) {
        const data = (await res.json()) as { slokas: Sloka[] };
        if (data.slokas?.length) {
          // Stable within the day, different across days.
          const idx =
            Math.floor(Date.now() / 86_400_000) % data.slokas.length;
          setSloka(data.slokas[idx]);
        }
      }
    } catch {
      /* the sit continues without a verse rather than failing the flow */
    }
  }

  function begin() {
    startedAtRef.current = Date.now();
    setSecondsLeft(minutes * 60);
    setRunning(true);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null) return s;
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          setStage("reflect");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const finishFlow = useCallback(async () => {
    const elapsed = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : minutes * 60;
    const result = await logPractice({
      practice: "flow",
      durationSec: Math.min(elapsed, 86_400),
      details: sloka ? { slokaId: sloka.id } : undefined,
    });
    if (result.ok) setStreak(result.streak);
    else setSignedOut(result.signedOut);
    setStage("done");
  }, [minutes, sloka]);

  async function saveReflection() {
    if (sloka && reflection.trim()) {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slokaId: sloka.id, reflection: reflection.trim() }),
      }).catch(() => {});
    }
    await finishFlow();
  }

  const translation =
    lang === "hi" ? sloka?.hindi_translation : sloka?.english_translation;

  return (
    <div className="max-w-2xl">
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
                onClick={() => void pickMood(mood.id)}
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
          {sloka ? (
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
                  onClick={() => setRunning((r) => !r)}
                  className="min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50"
                >
                  {running ? t("sadhanaPause") : t("sadhanaResume")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
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

      {stage === "reflect" ? (
        <section>
          <h2 className="font-display text-2xl text-[var(--text)]">
            {t("sadhanaReflectPrompt")}
          </h2>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder={t("sadhanaReflectPlaceholder")}
            rows={3}
            className="mt-5 w-full border border-[var(--line)] bg-transparent px-4 py-3 text-[15px] text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--brass)]/60 focus:outline-none"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void saveReflection()}
              className="min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("sadhanaSaveReflection")}
            </button>
            <button
              type="button"
              onClick={() => void finishFlow()}
              className="min-h-11 px-3 py-3 text-sm text-[var(--text-muted)] underline-offset-4 hover:text-[var(--brass-soft)] hover:underline"
            >
              {t("sadhanaSkipReflection")}
            </button>
          </div>
        </section>
      ) : null}

      {stage === "done" ? (
        <section className="py-4">
          <p className="font-display text-2xl text-[var(--text)]">
            {t("sadhanaComplete")}
          </p>
          {streak ? (
            <p className="mt-3 text-[15px] text-[var(--text-muted)]">
              {t("sadhanaStreakLine").replace("{n}", String(streak.current))}
              {streak.graceUsedToday ? (
                <span className="mt-1 block">{t("sadhanaGrace")}</span>
              ) : null}
            </p>
          ) : null}
          {signedOut ? (
            <p className="mt-3 text-[15px] text-[var(--text-muted)]">
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
            onClick={() => {
              setStage("mood");
              setSloka(null);
              setSecondsLeft(null);
              setReflection("");
              setStreak(null);
            }}
            className="mt-6 min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50"
          >
            {t("sadhanaAgain")}
          </button>
        </section>
      ) : null}

      <JapaPanel />
    </div>
  );
}

function JapaPanel() {
  const { lang, t } = useLanguage();
  const [beads, setBeads] = useState(0);
  const [malas, setMalas] = useState(0);
  const [mantras, setMantras] = useState<
    Array<{ id: string; devanagari: string; iast: string; meaning_en: string; meaning_hi: string }>
  >([]);
  const [mantraIdx, setMantraIdx] = useState(0);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    import("@/data/mantras.json")
      .then((mod) => setMantras(mod.default))
      .catch(() => {});
  }, []);

  const tap = useCallback(() => {
    setLogged(false);
    setBeads((b) => {
      if (b + 1 >= 108) {
        setMalas((m) => m + 1);
        return 0;
      }
      return b + 1;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap]);

  async function finishJapa() {
    const total = malas * 108 + beads;
    if (total === 0) return;
    const result = await logPractice({ practice: "japa", count: total });
    if (result.ok || result.signedOut) {
      setBeads(0);
      setMalas(0);
      setLogged(true);
    }
  }

  const mantra = mantras[mantraIdx];

  return (
    <section className="mt-16 border-t border-[var(--hairline)] pt-10">
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
          aria-label={t("japaTitle")}
          className="flex h-56 w-56 items-center justify-center rounded-full border border-[var(--brass)]/40 transition active:scale-[0.98]"
        >
          <span className="font-display text-5xl tabular-nums text-[var(--text)]">
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
            onClick={() => void finishJapa()}
            className="mt-4 min-h-10 border border-[var(--line)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50"
          >
            {t("japaFinish")}
          </button>
        ) : null}
        {logged ? (
          <p className="mt-3 text-sm text-[var(--brass-soft)]">{t("japaLogged")}</p>
        ) : null}
      </div>
    </section>
  );
}
