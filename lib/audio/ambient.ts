/**
 * Soft ambient bed under meditation sits. Prefers a hosted loop when present
 * (audio/ambient/*.m4a on the public audio bucket); then the same files under
 * /audio/ambient/ on this origin; otherwise a quiet Web Audio tanpura-ish pad
 * so sits never feel dry or clinical.
 */

export type AmbientBed = "off" | "drone" | "bowls" | "rain";

const HOSTED: Record<Exclude<AmbientBed, "off">, string> = {
  drone: "ambient/meditation-drone.m4a",
  bowls: "ambient/bowls.m4a",
  rain: "ambient/rain.m4a",
};

const LOCAL: Record<Exclude<AmbientBed, "off">, string> = {
  drone: "/audio/ambient/meditation-drone.m4a",
  bowls: "/audio/ambient/bowls.m4a",
  rain: "/audio/ambient/rain.m4a",
};

const BELL_PATH = "ambient/soft-bell.m4a";
const LOCAL_BELL = "/audio/ambient/soft-bell.m4a";

let padCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oscillators: OscillatorNode[] = [];
let loopEl: HTMLAudioElement | null = null;
let bellEl: HTMLAudioElement | null = null;
let running = false;

function audioBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function ambientLoopUrl(
  bed: Exclude<AmbientBed, "off"> = "drone"
): string | null {
  const base = audioBase();
  return base ? `${base}/${HOSTED[bed]}` : null;
}

export function softBellUrl(): string | null {
  const base = audioBase();
  return base ? `${base}/${BELL_PATH}` : null;
}

function playElement(
  url: string,
  loop: boolean,
  volume: number
): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const el = new Audio();
    el.loop = loop;
    el.preload = "auto";
    el.volume = Math.min(1, Math.max(0, volume));
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      el.onerror = null;
      el.removeAttribute("src");
      reject(new Error("audio failed"));
    };
    el.onerror = fail;
    el.src = url;
    void el
      .play()
      .then(() => {
        if (settled) return;
        settled = true;
        resolve(el);
      })
      .catch(fail);
    window.setTimeout(fail, 4000);
  });
}

/** One-shot soft bell when the last phase ends. Never throws; missing = no-op. */
export async function playSoftBell(volume = 0.35): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (bellEl) {
      bellEl.onerror = null;
      bellEl.pause();
      bellEl.removeAttribute("src");
      bellEl = null;
    }
    const urls = [softBellUrl(), LOCAL_BELL].filter(Boolean) as string[];
    for (const url of urls) {
      try {
        const el = await playElement(url, false, volume);
        bellEl = el;
        el.onended = () => {
          if (bellEl === el) bellEl = null;
        };
        return true;
      } catch {
        /* next candidate */
      }
    }
    return false;
  } catch {
    bellEl = null;
    return false;
  }
}

function stopPad() {
  for (const osc of oscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      /* already stopped */
    }
  }
  oscillators = [];
  masterGain = null;
  if (padCtx) {
    void padCtx.close().catch(() => undefined);
    padCtx = null;
  }
}

function stopLoop() {
  if (!loopEl) return;
  loopEl.onerror = null;
  loopEl.pause();
  loopEl.removeAttribute("src");
  loopEl = null;
}

export function stopAmbient(): void {
  running = false;
  stopLoop();
  stopPad();
}

function startPad(volume: number): boolean {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return false;

  const ctx = new AC();
  padCtx = ctx;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  masterGain = master;

  // Two slow-beating fifths + a soft octave — quiet "tanpura" feel.
  const voices: Array<{ f: number; gain: number; type: OscillatorType }> = [
    { f: 110, gain: 0.34, type: "sine" },
    { f: 164.81, gain: 0.2, type: "sine" },
    { f: 220, gain: 0.16, type: "sine" },
    { f: 329.63, gain: 0.05, type: "triangle" },
  ];
  for (const v of voices) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = v.type;
    osc.frequency.value = v.f;
    g.gain.value = v.gain;
    osc.connect(g);
    g.connect(master);
    osc.start();
    oscillators.push(osc);
  }

  const now = ctx.currentTime;
  master.gain.linearRampToValueAtTime(Math.min(0.1, volume), now + 2.2);
  void ctx.resume();
  return true;
}

/**
 * Start the ambient bed. Hosted loop, then origin copy, then generated pad.
 * Safe to call repeatedly — restarts cleanly.
 */
export async function startAmbient(
  volume = 0.07,
  bed: AmbientBed = "drone"
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  stopAmbient();
  if (bed === "off") return false;
  running = true;

  const urls = [ambientLoopUrl(bed), LOCAL[bed]].filter(Boolean) as string[];
  for (const url of urls) {
    try {
      const el = await playElement(url, true, volume);
      if (!running) {
        el.pause();
        el.removeAttribute("src");
        return false;
      }
      loopEl = el;
      return true;
    } catch {
      /* next */
    }
  }
  if (!running) return false;
  return startPad(volume);
}

export function setAmbientVolume(volume: number): void {
  const v = Math.min(1, Math.max(0, volume));
  if (loopEl) loopEl.volume = v;
  if (masterGain && padCtx) {
    masterGain.gain.setTargetAtTime(
      Math.min(0.1, v),
      padCtx.currentTime,
      0.15
    );
  }
}

export function isAmbientRunning(): boolean {
  return running;
}
