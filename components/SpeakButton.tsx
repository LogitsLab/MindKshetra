"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
  type SpeakLang,
} from "@/lib/tts";

type Props = {
  text: string;
  lang: SpeakLang;
  listenLabel: string;
  stopLabel: string;
  unsupportedLabel: string;
  className?: string;
  /** Compact icon-style control for chat bubbles. */
  compact?: boolean;
};

export default function SpeakButton({
  text,
  lang,
  listenLabel,
  stopLabel,
  unsupportedLabel,
  className = "",
  compact = false,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(isSpeechSynthesisSupported());
    if (!isSpeechSynthesisSupported()) return;

    const warm = () => {
      void window.speechSynthesis.getVoices();
    };
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", warm);
      stopSpeaking();
    };
  }, []);

  // Stop if the text/lang changes mid-playback
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [text, lang]);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const ok = speakText(text, {
      lang,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    if (!ok) setSpeaking(false);
  }, [supported, speaking, text, lang]);

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
      onClick={toggle}
      disabled={!text.trim()}
      aria-pressed={speaking}
      aria-label={speaking ? stopLabel : listenLabel}
      title={speaking ? stopLabel : listenLabel}
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
