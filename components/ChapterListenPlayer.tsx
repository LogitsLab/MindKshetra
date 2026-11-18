"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveRecitationUrl } from "@/lib/audio/manifest";
import {
  getNarrationSession,
  pauseNarration,
  playUrl,
  resumeNarration,
  stopNarration,
  stopNarrationIfOwner,
} from "@/lib/audio/narration";
import { useLanguage } from "@/components/LanguageProvider";

type Track = { verse: number; url: string };

type Props = {
  chapter: number;
  verseNumbers: number[];
};

const GAP_MS = 1800;
const RESUME_KEY = (chapter: number) =>
  `mindkshetra-chapter-listen-${chapter}`;

/**
 * Continuous Sanskrit recitation for a chapter — per-verse files in order,
 * with progress, resume, gaps, and prefetch of the next clips.
 */
export default function ChapterListenPlayer({
  chapter,
  verseNumbers,
}: Props) {
  const { t } = useLanguage();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");
  const [resumeVerse, setResumeVerse] = useState<number | null>(null);
  const ownerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const genRef = useRef(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESUME_KEY(chapter));
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) setResumeVerse(n);
    } catch {
      /* ignore */
    }
  }, [chapter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list: Track[] = [];
      for (const verse of verseNumbers) {
        const url = await resolveRecitationUrl(chapter, verse);
        if (url) list.push({ verse, url });
      }
      if (!cancelled) setTracks(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [chapter, verseNumbers]);

  useEffect(() => {
    tracksRef.current = tracks ?? [];
  }, [tracks]);

  const clearGap = () => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    genRef.current += 1;
    clearGap();
    if (ownerRef.current != null) {
      stopNarrationIfOwner(ownerRef.current);
      ownerRef.current = null;
    } else {
      stopNarration();
    }
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      clearGap();
      if (ownerRef.current != null) {
        stopNarrationIfOwner(ownerRef.current);
        ownerRef.current = null;
      }
    },
    []
  );

  const prefetchAround = (i: number) => {
    const list = tracksRef.current;
    for (let j = i + 1; j <= i + 3 && j < list.length; j++) {
      const a = new Audio();
      a.preload = "auto";
      a.src = list[j].url;
    }
  };

  const persistResume = (verse: number) => {
    try {
      localStorage.setItem(RESUME_KEY(chapter), String(verse));
      setResumeVerse(verse);
    } catch {
      /* ignore */
    }
  };

  const playFrom = useCallback(
    async (startIndex: number) => {
      const list = tracksRef.current;
      if (!list.length) return;
      clearGap();
      const next = Math.max(0, Math.min(startIndex, list.length - 1));
      indexRef.current = next;
      setIndex(next);
      const myGen = ++genRef.current;

      const playOne = async (i: number) => {
        if (myGen !== genRef.current) return;
        if (i >= list.length) {
          ownerRef.current = null;
          setStatus("idle");
          try {
            localStorage.removeItem(RESUME_KEY(chapter));
            setResumeVerse(null);
          } catch {
            /* ignore */
          }
          return;
        }
        indexRef.current = i;
        setIndex(i);
        const track = list[i];
        persistResume(track.verse);
        prefetchAround(i);
        const started = await playUrl(track.url, {
          onStart: () => {
            if (myGen !== genRef.current) return;
            ownerRef.current = getNarrationSession();
            setStatus("playing");
            document
              .getElementById(`verse-${track.verse}`)
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          },
          onEnd: () => {
            if (myGen !== genRef.current) return;
            gapTimerRef.current = setTimeout(() => {
              void playOne(i + 1);
            }, GAP_MS);
          },
          onError: () => {
            if (myGen !== genRef.current) return;
            void playOne(i + 1);
          },
          onStopped: () => {
            if (myGen !== genRef.current) return;
            setStatus("idle");
            ownerRef.current = null;
          },
        });
        if (!started && myGen === genRef.current) {
          void playOne(i + 1);
        }
      };

      await playOne(next);
    },
    [chapter]
  );

  if (tracks === null) {
    return (
      <div className="mt-6 border border-[var(--line)] bg-[var(--panel)]/50 px-4 py-3 text-sm text-[var(--text-muted)]">
        {t("chapterListenLoading")}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="mt-6 border border-[var(--line)] bg-[var(--panel)]/50 px-4 py-3 text-sm text-[var(--text-muted)]">
        {t("chapterListenUnavailable")}
      </div>
    );
  }

  const current = tracks[index];
  const progress = ((index + (status === "idle" ? 0 : 1)) / tracks.length) * 100;
  const resumeIndex =
    resumeVerse != null
      ? tracks.findIndex((tr) => tr.verse === resumeVerse)
      : -1;
  const label =
    status === "playing"
      ? t("chapterListenPause")
      : status === "paused"
        ? t("chapterListenResume")
        : resumeIndex > 0
          ? t("chapterListenContinue")
          : t("chapterListenPlay");

  return (
    <div className="mt-6 border border-[var(--line)] bg-[var(--panel)]/50 p-4 sm:p-5">
      <p className="eyebrow text-[var(--brass-soft)]">
        {t("chapterListenEyebrow")}
      </p>
      <p className="mt-2 text-sm font-light text-[var(--text-soft)]">
        {t("chapterListenBlurb")}
      </p>
      <div
        className="mt-4 h-1.5 overflow-hidden bg-[var(--line)]"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--brass)] transition-[width] duration-500"
          style={{
            width: `${status === "idle" && resumeIndex < 0 ? 0 : Math.max(4, progress)}%`,
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          onClick={() => {
            if (status === "playing" && ownerRef.current != null) {
              pauseNarration();
              setStatus("paused");
              return;
            }
            if (status === "paused" && ownerRef.current != null) {
              void resumeNarration(ownerRef.current).then((ok) => {
                if (ok) setStatus("playing");
                else void playFrom(indexRef.current);
              });
              return;
            }
            const start =
              status === "idle" && resumeIndex > 0 ? resumeIndex : 0;
            void playFrom(start);
          }}
        >
          {label}
        </button>
        {status === "idle" && resumeIndex > 0 ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--brass-soft)]"
            onClick={() => void playFrom(0)}
          >
            {t("chapterListenFromStart")}
          </button>
        ) : null}
        {status !== "idle" ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--brass-soft)]"
            onClick={stop}
          >
            {t("chapterListenStop")}
          </button>
        ) : null}
        {status !== "idle" ? (
          <>
            <button
              type="button"
              disabled={index <= 0}
              className="inline-flex min-h-11 items-center border border-[var(--line)] px-3 py-2.5 text-sm text-[var(--text-muted)] disabled:opacity-40"
              onClick={() => void playFrom(indexRef.current - 1)}
              aria-label={t("chapterListenPrev")}
            >
              ←
            </button>
            <button
              type="button"
              disabled={index >= tracks.length - 1}
              className="inline-flex min-h-11 items-center border border-[var(--line)] px-3 py-2.5 text-sm text-[var(--text-muted)] disabled:opacity-40"
              onClick={() => void playFrom(indexRef.current + 1)}
              aria-label={t("chapterListenNext")}
            >
              →
            </button>
          </>
        ) : null}
      </div>
      {status !== "idle" && current ? (
        <p className="mt-3 text-sm text-[var(--brass-soft)]">
          {t("chapterListenNow")
            .replace("{n}", String(current.verse))
            .replace("{total}", String(tracks.length))
            .replace("{i}", String(index + 1))}
        </p>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {t("chapterListenReady").replace("{n}", String(tracks.length))}
          {resumeIndex > 0
            ? ` · ${t("chapterListenResumeAt").replace("{n}", String(resumeVerse))}`
            : ""}
        </p>
      )}
    </div>
  );
}
