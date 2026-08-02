"use client";

import { resolveSpeechUrl } from "@/lib/audio/manifest";
import {
  speakText,
  stopSpeaking,
  type SpeakLang,
  type SpeakOptions,
} from "@/lib/tts";

/**
 * Narration = pre-generated studio audio when it exists, device TTS when it
 * doesn't. One shared element so starting any narration stops the previous
 * one, mirroring speechSynthesis's single-utterance behavior.
 */
let element: HTMLAudioElement | null = null;

function audioEl(): HTMLAudioElement {
  if (!element) element = new Audio();
  return element;
}

export function stopNarration(): void {
  stopSpeaking();
  if (element) {
    element.onended = null;
    element.onerror = null;
    element.pause();
    element.removeAttribute("src");
  }
}

export type NarrationOptions = SpeakOptions & {
  /** Explicit file to prefer over the text-hash lookup (e.g. recitation). */
  url?: string | null;
};

/**
 * Same contract as lib/tts.ts speakText, upgraded: resolves a pre-generated
 * file for this exact text first. Returns false only when neither audio nor
 * synthesis could start.
 */
export async function playOrSpeak(
  text: string,
  options: NarrationOptions
): Promise<boolean> {
  stopNarration();

  const url =
    options.url ?? (await resolveSpeechUrl(text, options.lang as SpeakLang));

  if (url) {
    const el = audioEl();
    el.src = url;
    el.playbackRate = options.rate ?? 1;
    el.onended = () => options.onEnd?.();
    // A failed file (deleted object, offline) degrades to TTS mid-flight.
    el.onerror = () => {
      const ok = speakText(text, options);
      if (!ok) options.onError?.();
    };
    try {
      await el.play();
      options.onStart?.();
      return true;
    } catch {
      // Autoplay rejection or network failure — fall through to TTS.
    }
  }

  return speakText(text, options);
}
