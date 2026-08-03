"use client";

/**
 * Client state for the predictions write-up (plan Phase B-2).
 *
 * The write-up is a single blocking 20-60s Groq completion. This hook makes
 * that wait survivable without restructuring the API:
 *
 * - one in-flight request shared between the eager prefetch (fired as soon as
 *   a computed chart renders) and the predictions tab, so opening the tab
 *   consumes the same promise instead of firing a second POST;
 * - a per-language cache, so EN <-> HI switches never overwrite each other and
 *   returning to a cached language is instant;
 * - an honest staged progress readout (elapsed-time copy, no fake percentages);
 * - cancel (AbortController) and typed failure kinds so the UI can offer the
 *   right affordance: a 429 countdown that auto-retries, a one-shot birth
 *   re-send for recoverable 404s, and a plain retry for 5xx/network.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChartPayload } from "@/lib/astrology/types";

export type PredictionsText = NonNullable<ChartPayload["predictionsText"]>;
export type PredictionsLang = PredictionsText["language"];

export type PredictionsErrorKind =
  | "rate-limited" // 429 — show countdown, auto-retry at zero
  | "expired" // recoverable 404 whose birth re-send also failed
  | "server" // 5xx or an unexpected status — offer retry
  | "network"; // fetch itself rejected — offer retry

export type PredictionsStage = 0 | 1 | 2;

/**
 * Honest stage boundaries for a 20-60s completion: the copy describes what the
 * server is actually doing at that point in a typical run, not a percentage.
 */
export const STAGE_SCHEDULE_MS: readonly [number, number, number] = [
  0, 8_000, 20_000,
];

export function stageForElapsedMs(elapsedMs: number): PredictionsStage {
  if (elapsedMs >= STAGE_SCHEDULE_MS[2]) return 2;
  if (elapsedMs >= STAGE_SCHEDULE_MS[1]) return 1;
  return 0;
}

/** The route rate-limits per minute; 30s is the honest midpoint fallback. */
export const RETRY_AFTER_FALLBACK_SEC = 30;
const RETRY_AFTER_MAX_SEC = 600;

/**
 * Parse a Retry-After header. Accepts both delta-seconds and HTTP-date forms;
 * clamps to [1, 600] so a bad clock can never produce a frozen countdown.
 */
export function parseRetryAfter(
  header: string | null | undefined
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.min(Math.max(parseInt(trimmed, 10), 1), RETRY_AFTER_MAX_SEC);
  }
  // A bare negative integer is spec-invalid, and Date.parse would happily
  // misread it as a year — reject it before the HTTP-date branch.
  if (/^-\d+$/.test(trimmed)) return null;
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  const sec = Math.ceil((at - Date.now()) / 1000);
  return Math.min(Math.max(sec, 1), RETRY_AFTER_MAX_SEC);
}

export type ClassifiedPredictionsError = {
  kind: PredictionsErrorKind;
  /** Only set for 429s; seconds until the client should retry. */
  retryAfterSec: number | null;
  /** True for the 404 contract that invites a birth re-send (see route). */
  recoverable: boolean;
};

/**
 * Map a failed /api/astrology/predictions response to an error kind.
 * Status 0 is the conventional stand-in for "fetch rejected" (network down).
 */
export function classifyPredictionsError(input: {
  status: number;
  retryAfterHeader?: string | null;
  body?: unknown;
}): ClassifiedPredictionsError {
  const { status, retryAfterHeader, body } = input;
  if (status === 429) {
    return {
      kind: "rate-limited",
      retryAfterSec:
        parseRetryAfter(retryAfterHeader) ?? RETRY_AFTER_FALLBACK_SEC,
      recoverable: true,
    };
  }
  if (status === 404) {
    const recoverable =
      typeof body === "object" &&
      body !== null &&
      (body as { recoverable?: unknown }).recoverable === true;
    // A non-recoverable 404 (e.g. member not found) gets the generic retry
    // affordance — there is nothing session-shaped the client can fix.
    return {
      kind: recoverable ? "expired" : "server",
      retryAfterSec: null,
      recoverable,
    };
  }
  if (status === 0) {
    return { kind: "network", retryAfterSec: null, recoverable: false };
  }
  return { kind: "server", retryAfterSec: null, recoverable: false };
}

/**
 * Same sessionStorage record app/astrology/page.tsx writes (the field stays
 * `sessionId` deliberately — see that file). Pure over the raw string so the
 * parsing is testable without a DOM.
 */
export const INCOGNITO_SESSION_KEY = "mindkshetra-astro-incognito";

export function parseStoredBirth(
  raw: string | null
): ChartPayload["birth"] | null {
  if (!raw || !raw.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(raw) as { birth?: ChartPayload["birth"] };
    return parsed.birth ?? null;
  } catch {
    return null;
  }
}

function readStoredBirth(): ChartPayload["birth"] | null {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredBirth(sessionStorage.getItem(INCOGNITO_SESSION_KEY));
  } catch {
    return null;
  }
}

type PredictionsState = {
  busy: boolean;
  stage: PredictionsStage;
  error: string | null;
  errorKind: PredictionsErrorKind | null;
  retryAfterSec: number | null;
};

const IDLE_STATE: PredictionsState = {
  busy: false,
  stage: 0,
  error: null,
  errorKind: null,
  retryAfterSec: null,
};

type LoadOptions = {
  /** Bypass the per-language cache and regenerate. */
  force?: boolean;
  /**
   * Marks prefetch/tab-open calls. After an explicit cancel, auto calls
   * no-op until the user asks again, so cancelling actually sticks.
   */
  auto?: boolean;
};

type LoadFailure = {
  classified: ClassifiedPredictionsError;
  message: string | null;
};

type UsePredictionsArgs = {
  chartSessionId?: string;
  memberId?: string;
  /** Birth details from the computed chart — sent so the server can rehydrate. */
  birth?: ChartPayload["birth"];
  /**
   * Identity of the chart these predictions belong to. Changing it aborts
   * in-flight work and clears the per-language cache. Deliberately excludes
   * asOfDate: the write-up is keyed on the birth moment, not the view date.
   */
  chartKey: string;
  /** Predictions that arrived with the chart payload itself. */
  initialText?: PredictionsText | null;
  /**
   * Legacy escape hatch when neither id is available: the parent-provided
   * request callback. No abort or status detail is possible through it.
   */
  fallbackRequest?: (force?: boolean) => Promise<ChartPayload>;
};

function seedCache(
  initialText: PredictionsText | null | undefined
): Partial<Record<PredictionsLang, PredictionsText>> {
  return initialText?.portrait
    ? { [initialText.language]: initialText }
    : {};
}

export function usePredictions({
  chartSessionId,
  memberId,
  birth,
  chartKey,
  initialText,
  fallbackRequest,
}: UsePredictionsArgs) {
  const [state, setState] = useState<PredictionsState>(IDLE_STATE);
  const [predictionsByLang, setPredictionsByLang] = useState<
    Partial<Record<PredictionsLang, PredictionsText>>
  >(() => seedCache(initialText));

  // Refs mirror everything load() needs synchronously: effects that fire in
  // the same commit (seed, prefetch) must not race React state updates.
  const cacheRef = useRef(predictionsByLang);
  const inflightRef = useRef<{
    lang: PredictionsLang;
    seq: number;
    promise: Promise<PredictionsText | null>;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const seqRef = useRef(0);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyRef = useRef(chartKey);
  const birthRef = useRef(birth);
  const fallbackRef = useRef(fallbackRequest);
  birthRef.current = birth;
  fallbackRef.current = fallbackRequest;

  const clearStageTimers = useCallback(() => {
    for (const timer of stageTimersRef.current) clearTimeout(timer);
    stageTimersRef.current = [];
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current !== null) clearInterval(countdownRef.current);
    countdownRef.current = null;
  }, []);

  const commitCache = useCallback(
    (lang: PredictionsLang, text: PredictionsText) => {
      cacheRef.current = { ...cacheRef.current, [lang]: text };
      setPredictionsByLang(cacheRef.current);
    },
    []
  );

  const loadRef = useRef<
    (lang: PredictionsLang, opts?: LoadOptions) => Promise<PredictionsText | null>
  >(() => Promise.resolve(null));

  const startCountdown = useCallback(
    (sec: number, lang: PredictionsLang) => {
      clearCountdown();
      let remaining = sec;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setState((s) => ({ ...s, retryAfterSec: remaining }));
          return;
        }
        clearCountdown();
        setState((s) => ({ ...s, retryAfterSec: 0 }));
        // The countdown promised a retry — keep it, unless the user cancelled.
        if (!cancelledRef.current) void loadRef.current(lang);
      }, 1_000);
    },
    [clearCountdown]
  );

  const load = useCallback(
    (
      lang: PredictionsLang,
      opts?: LoadOptions
    ): Promise<PredictionsText | null> => {
      const force = Boolean(opts?.force);
      const auto = Boolean(opts?.auto);

      const cached = cacheRef.current[lang];
      if (cached && !force) return Promise.resolve(cached);
      if (auto && cancelledRef.current) return Promise.resolve(null);
      if (!auto) cancelledRef.current = false;

      // Share the in-flight promise — but only a live one. A stale seq means
      // the request was aborted (cancel, reset, or a strict-mode dev remount)
      // and its promise will only ever resolve null.
      const inflight = inflightRef.current;
      if (
        inflight &&
        inflight.lang === lang &&
        inflight.seq === seqRef.current &&
        !force
      ) {
        return inflight.promise;
      }

      const seq = ++seqRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      clearStageTimers();
      clearCountdown();

      setState({ ...IDLE_STATE, busy: true });
      stageTimersRef.current = [
        setTimeout(() => {
          setState((s) => (s.busy ? { ...s, stage: 1 } : s));
        }, STAGE_SCHEDULE_MS[1]),
        setTimeout(() => {
          setState((s) => (s.busy ? { ...s, stage: 2 } : s));
        }, STAGE_SCHEDULE_MS[2]),
      ];

      const requestOnce = async (
        withBirth: ChartPayload["birth"] | null
      ): Promise<
        | { ok: true; text: PredictionsText }
        | { ok: false; failure: LoadFailure }
      > => {
        let res: Response;
        try {
          res = await fetch("/api/astrology/predictions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify(
              memberId
                ? { memberId, language: lang, force }
                : {
                    chartSessionId,
                    language: lang,
                    force,
                    ...(withBirth ? { birth: withBirth } : {}),
                  }
            ),
          });
        } catch (err) {
          if (controller.signal.aborted) throw err;
          return {
            ok: false,
            failure: {
              classified: classifyPredictionsError({ status: 0 }),
              message: null,
            },
          };
        }
        const data: unknown = await res.json().catch(() => null);
        if (res.ok) {
          const text = (data as { chart?: ChartPayload } | null)?.chart
            ?.predictionsText;
          if (text?.portrait) return { ok: true, text };
          return {
            ok: false,
            failure: {
              classified: classifyPredictionsError({ status: 500 }),
              message: null,
            },
          };
        }
        return {
          ok: false,
          failure: {
            classified: classifyPredictionsError({
              status: res.status,
              retryAfterHeader: res.headers.get("Retry-After"),
              body: data,
            }),
            message:
              typeof (data as { error?: unknown } | null)?.error === "string"
                ? ((data as { error: string }).error)
                : null,
          },
        };
      };

      const run = async (): Promise<PredictionsText | null> => {
        if (!memberId && !chartSessionId) {
          const fallback = fallbackRef.current;
          if (!fallback) return null;
          const chart = await fallback(force);
          const text = chart.predictionsText;
          if (!text?.portrait) {
            throw {
              classified: classifyPredictionsError({ status: 500 }),
              message: null,
            } satisfies LoadFailure;
          }
          return text;
        }

        let attempt = await requestOnce(birthRef.current ?? null);
        if (
          !attempt.ok &&
          attempt.failure.classified.recoverable &&
          attempt.failure.classified.kind === "expired"
        ) {
          // The 404 contract: the server lost the chart session but the client
          // still holds the birth details — re-send them once, automatically.
          const stored = readStoredBirth() ?? birthRef.current ?? null;
          if (stored) attempt = await requestOnce(stored);
        }
        if (!attempt.ok) throw attempt.failure;
        return attempt.text;
      };

      const promise = (async () => {
        try {
          const text = await run();
          if (seq !== seqRef.current) return null; // cancelled or superseded
          if (text) {
            commitCache(lang, text);
            setState(IDLE_STATE);
          }
          return text;
        } catch (err) {
          if (seq !== seqRef.current || controller.signal.aborted) return null;
          const failure: LoadFailure =
            err && typeof err === "object" && "classified" in err
              ? (err as LoadFailure)
              : {
                  classified: classifyPredictionsError({ status: 0 }),
                  message: err instanceof Error ? err.message : null,
                };
          setState({
            busy: false,
            stage: 0,
            error: failure.message,
            errorKind: failure.classified.kind,
            retryAfterSec: failure.classified.retryAfterSec,
          });
          if (
            failure.classified.kind === "rate-limited" &&
            failure.classified.retryAfterSec
          ) {
            startCountdown(failure.classified.retryAfterSec, lang);
          }
          return null;
        } finally {
          if (seq === seqRef.current) {
            clearStageTimers();
            inflightRef.current = null;
            if (abortRef.current === controller) abortRef.current = null;
          }
        }
      })();

      inflightRef.current = { lang, seq, promise };
      return promise;
    },
    [
      chartSessionId,
      memberId,
      clearStageTimers,
      clearCountdown,
      commitCache,
      startCountdown,
    ]
  );
  loadRef.current = load;

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    seqRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    inflightRef.current = null;
    clearStageTimers();
    clearCountdown();
    setState(IDLE_STATE);
  }, [clearStageTimers, clearCountdown]);

  // New chart identity: drop everything belonging to the previous chart.
  useEffect(() => {
    if (keyRef.current === chartKey) return;
    keyRef.current = chartKey;
    seqRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    inflightRef.current = null;
    cancelledRef.current = false;
    clearStageTimers();
    clearCountdown();
    cacheRef.current = seedCache(initialText);
    setPredictionsByLang(cacheRef.current);
    setState(IDLE_STATE);
  }, [chartKey, initialText, clearStageTimers, clearCountdown]);

  // Predictions that arrive with a later chart payload (e.g. a member chart
  // whose cache already held a write-up) seed the language cache.
  useEffect(() => {
    if (!initialText?.portrait) return;
    if (cacheRef.current[initialText.language]) return;
    cacheRef.current = {
      ...cacheRef.current,
      [initialText.language]: initialText,
    };
    setPredictionsByLang(cacheRef.current);
  }, [initialText]);

  // Unmount: stop timers and drop the request.
  useEffect(() => {
    return () => {
      seqRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      inflightRef.current = null;
      for (const timer of stageTimersRef.current) clearTimeout(timer);
      stageTimersRef.current = [];
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
      countdownRef.current = null;
    };
  }, []);

  return {
    busy: state.busy,
    stage: state.stage,
    error: state.error,
    errorKind: state.errorKind,
    retryAfterSec: state.retryAfterSec,
    predictionsByLang,
    load,
    cancel,
  };
}
