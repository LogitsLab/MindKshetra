/**
 * Soft ambient bed under meditation sits. Prefers a hosted loop when present
 * (audio/ambient/meditation-drone.m4a on the public audio bucket); otherwise
 * a quiet Web Audio tanpura-ish pad so sits never feel dry or clinical.
 */

const DRONE_PATH = "ambient/meditation-drone.m4a";

let padCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oscillators: OscillatorNode[] = [];
let loopEl: HTMLAudioElement | null = null;
let running = false;

function audioBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/** Hosted CC0/licensed loop, if the bucket has one. */
export function ambientLoopUrl(): string | null {
  const base = audioBase();
  return base ? `${base}/${DRONE_PATH}` : null;
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

function tryHostedLoop(volume: number): Promise<boolean> {
  const url = ambientLoopUrl();
  if (!url) return Promise.resolve(false);

  return new Promise((resolve) => {
    const el = new Audio();
    el.loop = true;
    el.preload = "auto";
    el.volume = Math.min(1, Math.max(0, volume));
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      el.onerror = null;
      el.oncanplaythrough = null;
      el.removeAttribute("src");
      resolve(false);
    };
    const succeed = async () => {
      if (settled) return;
      settled = true;
      try {
        await el.play();
        if (!running) {
          el.pause();
          resolve(false);
          return;
        }
        loopEl = el;
        resolve(true);
      } catch {
        fail();
      }
    };
    el.onerror = fail;
    el.oncanplaythrough = () => {
      void succeed();
    };
    // Some browsers never fire canplaythrough for short loops — race a play().
    el.src = url;
    void el
      .play()
      .then(() => {
        if (settled) return;
        settled = true;
        if (!running) {
          el.pause();
          resolve(false);
          return;
        }
        loopEl = el;
        resolve(true);
      })
      .catch(() => {
        /* wait for canplaythrough / error */
      });
    window.setTimeout(fail, 4000);
  });
}

/**
 * Start the ambient bed. Tries the hosted loop first; falls back to the pad.
 * Safe to call repeatedly — restarts cleanly.
 */
export async function startAmbient(volume = 0.07): Promise<boolean> {
  if (typeof window === "undefined") return false;
  stopAmbient();
  running = true;

  if (await tryHostedLoop(volume)) return true;
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
