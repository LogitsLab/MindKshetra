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
 *
 * Session ownership lets SpeakButton stop only its own playback — a late-
 * mounting story Listen must not kill an in-flight Sanskrit recitation.
 */
let element: HTMLAudioElement | null = null;
/** Bumped on every stop / new play so ownership checks stay accurate. */
let session = 0;
/** Active UI callback — notified when something else stops playback. */
let activeStopped: (() => void) | null = null;

function audioEl(): HTMLAudioElement {
  if (!element) element = new Audio();
  return element;
}

function clearActiveCallbacks(): void {
  activeStopped = null;
}

function bindActiveCallbacks(options: { onStopped?: () => void }): void {
  activeStopped = options.onStopped ?? null;
}

/** Current narration session id (for ownership checks in UI). */
export function getNarrationSession(): number {
  return session;
}

export function stopNarration(): void {
  session += 1;
  const prevStopped = activeStopped;
  clearActiveCallbacks();
  stopSpeaking();
  if (element) {
    element.onended = null;
    element.onerror = null;
    element.pause();
    element.removeAttribute("src");
  }
  prevStopped?.();
}

/** Stop only if `ownerSession` still owns the global player. */
export function stopNarrationIfOwner(ownerSession: number): void {
  if (ownerSession === session) {
    stopNarration();
  }
}

export type NarrationOptions = SpeakOptions & {
  /** Explicit file to prefer over the text-hash lookup (e.g. recitation). */
  url?: string | null;
  onStopped?: () => void;
};

type PlayUrlOptions = {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

/** Play a single audio file with no TTS fallback (Sanskrit recitation). */
export async function playUrl(
  url: string,
  options: PlayUrlOptions = {}
): Promise<boolean> {
  stopNarration();
  const mySession = session;
  bindActiveCallbacks(options);
  const el = audioEl();
  el.src = url;
  el.playbackRate = options.rate ?? 1;
  el.onended = () => {
    if (mySession !== session) return;
    clearActiveCallbacks();
    options.onEnd?.();
  };
  el.onerror = () => {
    if (mySession !== session) return;
    clearActiveCallbacks();
    options.onError?.();
  };
  try {
    await el.play();
    if (mySession !== session) {
      options.onStopped?.();
      return false;
    }
    options.onStart?.();
    return true;
  } catch {
    if (mySession === session) {
      clearActiveCallbacks();
      options.onError?.();
    }
    return false;
  }
}

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
  const mySession = session;
  bindActiveCallbacks(options);

  const url =
    options.url ?? (await resolveSpeechUrl(text, options.lang as SpeakLang));

  if (mySession !== session) {
    options.onStopped?.();
    return false;
  }

  if (url) {
    const el = audioEl();
    el.src = url;
    el.playbackRate = options.rate ?? 1;
    el.onended = () => {
      if (mySession !== session) return;
      clearActiveCallbacks();
      options.onEnd?.();
    };
    // A failed file (deleted object, offline) degrades to TTS mid-flight.
    el.onerror = () => {
      if (mySession !== session) return;
      clearActiveCallbacks();
      const ok = speakText(text, options);
      if (!ok) options.onError?.();
    };
    try {
      await el.play();
      if (mySession !== session) {
        options.onStopped?.();
        return false;
      }
      options.onStart?.();
      return true;
    } catch {
      // Autoplay rejection or network failure — fall through to TTS.
    }
  }

  if (mySession !== session) {
    options.onStopped?.();
    return false;
  }

  return speakText(text, options);
}
