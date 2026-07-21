/** Client-side text-to-speech via the Web Speech API. */

export type SpeakLang = "en" | "hi";

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Strip markdown / section labels so speech sounds natural. */
export function textForSpeech(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\(\s*See\s+[\d.]+\s*\.?\)/gi, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(lang: SpeakLang): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferred =
    lang === "hi"
      ? ["hi-IN", "hi_IN", "hi"]
      : ["en-IN", "en-GB", "en-US", "en"];

  for (const code of preferred) {
    const match = voices.find(
      (v) =>
        v.lang.toLowerCase() === code.toLowerCase() ||
        v.lang.toLowerCase().startsWith(code.toLowerCase().split("-")[0])
    );
    if (match) return match;
  }

  return voices[0] ?? null;
}

export type SpeakOptions = {
  lang: SpeakLang;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

/** Cancel any in-progress utterance. */
export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * Speak text. Cancels any current utterance first.
 * Returns false if synthesis is unavailable or text is empty.
 */
export function speakText(text: string, options: SpeakOptions): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  const cleaned = textForSpeech(text);
  if (!cleaned) return false;

  stopSpeaking();

  // Chrome often returns [] until voiceschanged — warm the list
  void window.speechSynthesis.getVoices();

  const utter = new SpeechSynthesisUtterance(cleaned);
  utter.lang = options.lang === "hi" ? "hi-IN" : "en-IN";
  utter.rate = options.rate ?? (options.lang === "hi" ? 0.95 : 1);
  const voice = pickVoice(options.lang);
  if (voice) utter.voice = voice;

  utter.onstart = () => options.onStart?.();
  utter.onend = () => options.onEnd?.();
  utter.onerror = () => options.onError?.();

  // Small delay helps Chrome after cancel()
  window.setTimeout(() => {
    window.speechSynthesis.speak(utter);
  }, 40);

  return true;
}
