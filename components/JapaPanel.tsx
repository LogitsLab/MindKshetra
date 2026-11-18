"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { MilestoneLine, takeNewMilestone } from "@/components/MilestoneMarks";
import type { Milestone } from "@/lib/milestones";
import { hasJapaChant, playJapaChant, stopJapaChant } from "@/lib/audio/japa";
import {
  appendDeviceLog,
  localDayStamp,
  logPractice,
  newClientRef,
} from "@/lib/sadhana-device-log";
import {
  JAPA_DAILY_GOAL,
  readJapaStats,
  recordJapaBeads,
  type JapaStats,
} from "@/lib/japa-stats";

const CUSTOM_MANTRA_ID = "custom";
const JAPA_PREFS_KEY = "mindkshetra-japa-prefs";
const JAPA_TARGETS = [27, 54, 108] as const;
type JapaTarget = (typeof JAPA_TARGETS)[number];
type JapaMode = "assisted" | "self";
type JapaMantra = {
  id: string;
  devanagari: string;
  iast: string;
  meaning_en: string;
  meaning_hi: string;
};

function looksDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function customMantra(naam: string): JapaMantra {
  const trimmed = naam.trim();
  return {
    id: CUSTOM_MANTRA_ID,
    devanagari: trimmed,
    iast: looksDevanagari(trimmed) ? "" : trimmed,
    meaning_en: "The name you brought to this mala.",
    meaning_hi: "वह नाम जो आप इस माला पर लाए।",
  };
}

function readJapaPrefs(): {
  mantraId: string;
  customNaam: string;
  target: JapaTarget;
  mode: JapaMode;
} {
  try {
    const parsed = JSON.parse(localStorage.getItem(JAPA_PREFS_KEY) ?? "{}") as {
      mantraId?: unknown;
      customNaam?: unknown;
      target?: unknown;
      mode?: unknown;
    };
    const target = JAPA_TARGETS.includes(parsed.target as JapaTarget)
      ? (parsed.target as JapaTarget)
      : 108;
    const mode: JapaMode = parsed.mode === "assisted" ? "assisted" : "self";
    return {
      mantraId:
        typeof parsed.mantraId === "string" && parsed.mantraId
          ? parsed.mantraId
          : "om",
      customNaam:
        typeof parsed.customNaam === "string" ? parsed.customNaam : "",
      target,
      mode,
    };
  } catch {
    return { mantraId: "om", customNaam: "", target: 108, mode: "self" };
  }
}

function writeJapaPrefs(prefs: {
  mantraId: string;
  customNaam: string;
  target: JapaTarget;
  mode: JapaMode;
}): void {
  try {
    localStorage.setItem(JAPA_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export default function JapaPanel({
  visible,
  hideSetupHeading = false,
}: {
  visible: boolean;
  hideSetupHeading?: boolean;
}) {
  const { lang, t } = useLanguage();
  const [stage, setStage] = useState<"setup" | "count">("setup");
  const [beads, setBeads] = useState(0);
  const [mantras, setMantras] = useState<JapaMantra[]>([]);
  const [mantraId, setMantraId] = useState("om");
  const [customNaam, setCustomNaam] = useState("");
  const [target, setTarget] = useState<JapaTarget>(108);
  const [mode, setMode] = useState<JapaMode>("self");
  const [outcome, setOutcome] = useState<
    null | "logged" | "deviceOnly" | "failed"
  >(null);
  const [busy, setBusy] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tick, setTick] = useState(false);
  const [stats, setStats] = useState<JapaStats | null>(null);
  const japaBodyRef = useRef<Record<string, unknown> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef(mode);
  const targetRef = useRef(target);
  const mantraRef = useRef<JapaMantra>(customMantra(""));
  const beadsRef = useRef(0);

  useEffect(() => {
    import("@/data/mantras.json")
      .then((mod) => setMantras(mod.default as JapaMantra[]))
      .catch(() => {});
    const prefs = readJapaPrefs();
    setMantraId(prefs.mantraId);
    setCustomNaam(prefs.customNaam);
    setTarget(prefs.target);
    setMode(prefs.mode);
    setStats(readJapaStats());
  }, []);

  const mantra: JapaMantra =
    mantraId === CUSTOM_MANTRA_ID
      ? customMantra(customNaam)
      : (mantras.find((m) => m.id === mantraId) ??
        mantras[0] ??
        customMantra(customNaam));

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  useEffect(() => {
    mantraRef.current = mantra;
  }, [mantra]);
  useEffect(() => {
    beadsRef.current = beads;
  }, [beads]);

  const tap = useCallback(() => {
    if (beadsRef.current >= targetRef.current) return;
    setEngaged(true);
    setOutcome(null);
    setMilestone(null);
    japaBodyRef.current = null;
    if (modeRef.current === "assisted") {
      playJapaChant(mantraRef.current.id);
    }
    setBeads((b) => {
      const next = Math.min(b + 1, targetRef.current);
      if (next >= targetRef.current) {
        void takeNewMilestone().then(setMilestone);
      }
      return next;
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
      stopJapaChant();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setEngaged(false);
      return;
    }
    if (stage !== "count") return;
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
  }, [tap, visible, engaged, focused, stage]);

  function beginCount() {
    const chosen =
      mantraId === CUSTOM_MANTRA_ID && !customNaam.trim()
        ? (mantras[0]?.id ?? "om")
        : mantraId;
    setMantraId(chosen);
    writeJapaPrefs({
      mantraId: chosen,
      customNaam,
      target,
      mode,
    });
    setBeads(0);
    beadsRef.current = 0;
    japaBodyRef.current = null;
    setOutcome(null);
    setMilestone(null);
    setStage("count");
  }

  function anotherRound() {
    setBeads(0);
    beadsRef.current = 0;
    japaBodyRef.current = null;
    setOutcome(null);
    setMilestone(null);
    setEngaged(true);
  }

  async function finishJapa() {
    stopJapaChant();
    const total = beads;
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
      setStats(recordJapaBeads(total));
      setOutcome("logged");
      setMilestone(await takeNewMilestone());
      setStage("setup");
    } else if (result.reason === "signedOut") {
      appendDeviceLog({
        practice: "japa",
        occurredOn: localDayStamp(),
        count: Number(body.count) || total,
        clientRef: String(body.clientRef),
      });
      japaBodyRef.current = null;
      setBeads(0);
      setStats(recordJapaBeads(total));
      setOutcome("deviceOnly");
      setMilestone(await takeNewMilestone());
      setStage("setup");
    } else {
      setOutcome("failed");
    }
  }

  const complete = beads >= target;
  const canBegin =
    mantraId !== CUSTOM_MANTRA_ID || customNaam.trim().length > 0;

  return (
    <section
      id="japa"
      hidden={!visible}
      className="life-hub__panel scroll-mt-24 mt-14"
    >
      <p className="eyebrow text-[var(--brass)]">{t("japaTitle")}</p>
      {stage === "setup" && hideSetupHeading ? null : (
        <h2 className="mt-2 font-display text-2xl text-[var(--text)]">
          {stage === "setup" ? t("japaSetupTitle") : t("japaTitle")}
        </h2>
      )}
      <p className="mt-2 max-w-xl text-[15px] font-light text-[var(--text-muted)]">
        {stage === "setup" ? t("japaSetupIntro") : t("japaIntro")}
      </p>

      {stage === "setup" ? (
        <div className="mt-8">
          {stats && (stats.lifetimeBeads > 0 || stats.dayBeads > 0) ? (
            <div className="mb-6 space-y-1 text-sm text-[var(--text-muted)]">
              {stats.lifetimeBeads > 0 ? (
                <p>
                  {t("japaLifetime")
                    .replace("{beads}", String(stats.lifetimeBeads))
                    .replace(
                      "{malas}",
                      String(Math.floor(stats.lifetimeBeads / 108))
                    )}
                </p>
              ) : null}
              <p className="text-[var(--brass-soft)]">
                {stats.dayBeads >= JAPA_DAILY_GOAL
                  ? t("japaDailyGoalMet").replace(
                      "{n}",
                      String(stats.dayBeads)
                    )
                  : t("japaDailyToday")
                      .replace("{n}", String(stats.dayBeads))
                      .replace("{goal}", String(JAPA_DAILY_GOAL))}
              </p>
            </div>
          ) : null}
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("japaPickTitle")}
          </p>
          <ul className="mt-3 space-y-1">
            {mantras.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setMantraId(m.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition ${
                    mantraId === m.id
                      ? "bg-[var(--surface-hover)]"
                      : "hover:bg-[var(--surface-hover)]/50"
                  }`}
                >
                  <p className="font-display text-lg text-[var(--text)]">
                    {m.devanagari}
                  </p>
                  <p className="text-sm italic text-[var(--text-muted)]">
                    {m.iast}
                  </p>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setMantraId(CUSTOM_MANTRA_ID)}
                className={`w-full rounded-lg px-3 py-2 text-left transition ${
                  mantraId === CUSTOM_MANTRA_ID
                    ? "bg-[var(--surface-hover)]"
                    : "hover:bg-[var(--surface-hover)]/50"
                }`}
              >
                <p className="font-display text-lg text-[var(--text)]">
                  {t("japaCustomNaam")}
                </p>
              </button>
              {mantraId === CUSTOM_MANTRA_ID ? (
                <input
                  type="text"
                  value={customNaam}
                  onChange={(e) => setCustomNaam(e.target.value)}
                  placeholder={t("japaCustomPlaceholder")}
                  className="mt-2 w-full min-h-12 border border-[var(--line)] bg-transparent px-3 py-2 text-[var(--text)]"
                />
              ) : null}
            </li>
          </ul>

          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("japaTargetLabel")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {JAPA_TARGETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTarget(n)}
                className={`min-h-10 border px-4 py-2 text-sm ${
                  target === n
                    ? "border-[var(--brass)] text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("japaModeLabel")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["assisted", "self"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`min-h-10 border px-4 py-2 text-sm ${
                  mode === m
                    ? "border-[var(--brass)] text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)]"
                }`}
              >
                {m === "assisted" ? t("japaModeAssisted") : t("japaModeSelf")}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {mode === "assisted"
              ? hasJapaChant(mantraId)
                ? t("japaModeAssistedHint")
                : t("japaModeAssistedNoneHint")
              : t("japaModeSelfHint")}
          </p>
          {mode === "assisted" && hasJapaChant(mantraId) ? (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {t("japaChantCredit")}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canBegin}
            onClick={beginCount}
            className="mt-8 min-h-11 bg-[var(--brass)] px-5 py-2 text-sm font-medium text-[var(--on-brass)] disabled:opacity-50"
          >
            {t("japaBegin")}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t("japaMantra")}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="font-display text-xl text-[var(--text)]">
                {mantra.devanagari || mantra.iast}
              </p>
              <button
                type="button"
                onClick={() => {
                  stopJapaChant();
                  setStage("setup");
                }}
                className="text-sm text-[var(--brass-soft)] hover:underline"
              >
                {t("japaChangeSetup")}
              </button>
            </div>
            <p className="mt-1 text-sm font-light text-[var(--text-muted)]">
              {lang === "hi" ? mantra.meaning_hi : mantra.meaning_en}
            </p>
          </div>

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
                <span className="text-xl text-[var(--text-muted)]">
                  {" "}
                  / {target}
                </span>
              </span>
            </button>
            {complete ? (
              <>
                <p className="mt-4 text-sm text-[var(--brass-soft)]">
                  {t("japaTargetDone")}
                </p>
                <button
                  type="button"
                  onClick={anotherRound}
                  className="mt-3 min-h-10 border border-[var(--brass)]/50 px-5 py-2 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]"
                >
                  {t("japaAnotherRound")}
                </button>
              </>
            ) : null}
            {beads > 0 ? (
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
              <p className="mt-3 text-sm text-[var(--brass-soft)]">
                {t("japaLogged")}
              </p>
            ) : null}
            {(outcome === "logged" || outcome === "deviceOnly") && milestone ? (
              <MilestoneLine milestone={milestone} />
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
        </>
      )}
    </section>
  );
}