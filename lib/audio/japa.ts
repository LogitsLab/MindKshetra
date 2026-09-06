import { hasJapaChant } from "@/lib/audio/japaChants";

export { hasJapaChant, JAPA_CHANT_IDS } from "@/lib/audio/japaChants";
export type { JapaChantId } from "@/lib/audio/japaChants";

let chantEl: HTMLAudioElement | null = null;

export function stopJapaChant(): void {
  if (typeof window === "undefined") return;
  if (!chantEl) return;
  chantEl.onerror = null;
  chantEl.onended = null;
  try {
    chantEl.pause();
  } catch {
    /* ignore */
  }
  chantEl.removeAttribute("src");
  chantEl = null;
}

/**
 * Restart the recitation for this mantra. No TTS fallback. A new tap
 * cancels the previous clip so beads never overlap.
 */
export function playJapaChant(mantraId: string): boolean {
  if (typeof window === "undefined") return false;
  if (!hasJapaChant(mantraId)) {
    stopJapaChant();
    return false;
  }
  stopJapaChant();
  try {
    const el = new Audio(`/audio/japa/${mantraId}.m4a`);
    el.preload = "auto";
    el.loop = false;
    el.volume = 0.92;
    chantEl = el;
    el.onended = () => {
      if (chantEl === el) chantEl = null;
    };
    el.onerror = () => {
      if (chantEl === el) chantEl = null;
    };
    void el.play().catch(() => {
      if (chantEl === el) chantEl = null;
    });
    return true;
  } catch {
    stopJapaChant();
    return false;
  }
}
