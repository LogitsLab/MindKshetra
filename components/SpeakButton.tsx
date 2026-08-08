"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveRecitationUrl } from "@/lib/audio/manifest";
import {
  getNarrationSession,
  playOrSpeak,
  playUrl,
  stopNarration,
  stopNarrationIfOwner,
} from "@/lib/audio/narration";
import { isSpeechSynthesisSupported, type SpeakLang } from "@/lib/tts";

type Props = {
  text: string;
  lang: SpeakLang;
  listenLabel: string;
  stopLabel: string;
  unsupportedLabel: string;
  className?: string;
  /** Compact icon-style control for chat bubbles. */
  compact?: boolean;
  /**
   * Prefer the Sanskrit recitation file for this verse from the audio bucket
   * (`recitation/{chapter}-{verse}.m4a`) when present; falls back to `text`.
   */
  chapter?: number;
  verseNumber?: number;
  /** When true, only play if a recitation file exists — no TTS fallback. */
  recitationOnly?: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
};

export default function SpeakButton({
  text,
  lang,
  listenLabel,
  stopLabel,
  unsupportedLabel,
  className = "",
  compact = false,
  chapter,
  verseNumber,
  recitationOnly = false,
  onSpeakingChange,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recitationReady, setRecitationReady] = useState(!recitationOnly);
  const ownerSessionRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const setSpeakingState = useCallback(
    (next: boolean) => {
      setSpeaking(next);
      onSpeakingChange?.(next);
    },
    [onSpeakingChange]
  );

  useEffect(() => {
    // Pre-generated audio plays through a plain <audio> element, so the
    // control is useful even where speechSynthesis is absent.
    setSupported(true);
    if (!isSpeechSynthesisSupported()) return;

    const warm = () => {
      void window.speechSynthesis.getVoices();
    };
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", warm);
    };
  }, []);

  // When verse/lang/text changes: stop only if we own the player.
  useEffect(() => {
    if (ownerSessionRef.current != null) {
      stopNarrationIfOwner(ownerSessionRef.current);
      ownerSessionRef.current = null;
    }
    setSpeakingState(false);
  }, [text, lang, chapter, verseNumber, setSpeakingState]);

  // Unmount: stop only our session (another SpeakButton may still be playing).
  useEffect(
    () => () => {
      if (ownerSessionRef.current != null) {
        stopNarrationIfOwner(ownerSessionRef.current);
        ownerSessionRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!recitationOnly || chapter == null || verseNumber == null) {
      setRecitationReady(true);
      return;
    }
    let cancelled = false;
    void resolveRecitationUrl(chapter, verseNumber).then((url) => {
      if (!cancelled) setRecitationReady(Boolean(url));
    });
    return () => {
      cancelled = true;
    };
  }, [recitationOnly, chapter, verseNumber]);

  const toggle = useCallback(async () => {
    if (!supported) return;
    if (speaking) {
      if (ownerSessionRef.current != null) {
        stopNarrationIfOwner(ownerSessionRef.current);
      } else {
        stopNarration();
      }
      ownerSessionRef.current = null;
      setSpeakingState(false);
      return;
    }

    const myGen = ++genRef.current;

    const url =
      chapter != null && verseNumber != null
        ? await resolveRecitationUrl(chapter, verseNumber)
        : null;

    if (myGen !== genRef.current) return;

    const bindOwner = () => {
      ownerSessionRef.current = getNarrationSession();
    };

    const clearOwner = () => {
      ownerSessionRef.current = null;
      setSpeakingState(false);
    };

    if (recitationOnly) {
      if (!url) {
        setSpeakingState(false);
        return;
      }
      // Play the file only — do not fall back to speaking the translation.
      const ok = await playUrl(url, {
        onStart: () => {
          if (myGen !== genRef.current) return;
          bindOwner();
          setSpeakingState(true);
        },
        onEnd: () => {
          if (myGen !== genRef.current) return;
          clearOwner();
        },
        onStopped: () => {
          if (myGen !== genRef.current) return;
          clearOwner();
        },
        onError: () => {
          if (myGen !== genRef.current) return;
          clearOwner();
        },
      });
      if (!ok && myGen === genRef.current) clearOwner();
      return;
    }

    const ok = await playOrSpeak(text, {
      lang,
      url,
      onStart: () => {
        if (myGen !== genRef.current) return;
        bindOwner();
        setSpeakingState(true);
      },
      onEnd: () => {
        if (myGen !== genRef.current) return;
        clearOwner();
      },
      onStopped: () => {
        if (myGen !== genRef.current) return;
        clearOwner();
      },
      onError: () => {
        if (myGen !== genRef.current) return;
        clearOwner();
      },
    });
    if (!ok && myGen === genRef.current) clearOwner();
  }, [
    supported,
    speaking,
    text,
    lang,
    chapter,
    verseNumber,
    recitationOnly,
    setSpeakingState,
  ]);

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title={unsupportedLabel}
        className={`opacity-40 ${className}`}
        aria-label={unsupportedLabel}
      >
        {compact ? "♪" : listenLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }}
      disabled={recitationOnly ? !recitationReady : !text.trim()}
      aria-pressed={speaking}
      aria-label={speaking ? stopLabel : listenLabel}
      title={
        recitationOnly && !recitationReady
          ? unsupportedLabel
          : speaking
            ? stopLabel
            : listenLabel
      }
      className={`transition disabled:opacity-40 ${
        compact
          ? "min-h-9 min-w-9 px-2 text-sm"
          : "min-h-10 border border-[var(--line)] px-3 py-2 text-sm"
      } ${
        speaking
          ? "border-[var(--brass)]/50 text-[var(--brass-soft)]"
          : "text-[var(--text-muted)] hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
      } ${className}`}
    >
      {speaking ? stopLabel : listenLabel}
    </button>
  );
}
