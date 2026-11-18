/**
 * Device-local meditation tally. Lifetime malas are not used here —
 * minutes and sits mirror the japa bead counter.
 */
export const MEDITATION_STATS_KEY = "mindkshetra-meditation-stats";
export const MEDITATION_DAILY_GOAL_MIN = 20;
export const SILENT_SETUP_KEY = "mindkshetra-silent-setup";

export type MeditationStats = {
  lifetimeMinutes: number;
  lifetimeSits: number;
  dayStamp: string;
  dayMinutes: number;
  daySits: number;
};

export type SilentSetup = {
  minutes: number;
  bed: "off" | "drone" | "bowls" | "rain";
  intervalMin: 0 | 5 | 10;
};

export const SILENT_PRESETS = [5, 10, 15, 20, 30, 45] as const;

export function localDayStamp(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function emptyMeditationStats(now = new Date()): MeditationStats {
  return {
    lifetimeMinutes: 0,
    lifetimeSits: 0,
    dayStamp: localDayStamp(now),
    dayMinutes: 0,
    daySits: 0,
  };
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readMeditationStats(): MeditationStats {
  const today = localDayStamp();
  const ls = storage();
  if (!ls) return emptyMeditationStats();
  try {
    const raw = ls.getItem(MEDITATION_STATS_KEY);
    if (!raw) return emptyMeditationStats();
    const p = JSON.parse(raw) as Partial<MeditationStats>;
    const lifetimeMinutes =
      typeof p.lifetimeMinutes === "number" && p.lifetimeMinutes >= 0
        ? Math.floor(p.lifetimeMinutes)
        : 0;
    const lifetimeSits =
      typeof p.lifetimeSits === "number" && p.lifetimeSits >= 0
        ? Math.floor(p.lifetimeSits)
        : 0;
    const same = p.dayStamp === today;
    return {
      lifetimeMinutes,
      lifetimeSits,
      dayStamp: today,
      dayMinutes:
        same && typeof p.dayMinutes === "number" && p.dayMinutes >= 0
          ? Math.floor(p.dayMinutes)
          : 0,
      daySits:
        same && typeof p.daySits === "number" && p.daySits >= 0
          ? Math.floor(p.daySits)
          : 0,
    };
  } catch {
    return emptyMeditationStats();
  }
}

export function recordMeditationSit(durationSec: number): MeditationStats {
  const cur = readMeditationStats();
  const minutes = Math.max(1, Math.round((durationSec || 0) / 60));
  const next: MeditationStats = {
    lifetimeMinutes: cur.lifetimeMinutes + minutes,
    lifetimeSits: cur.lifetimeSits + 1,
    dayStamp: localDayStamp(),
    dayMinutes: cur.dayMinutes + minutes,
    daySits: cur.daySits + 1,
  };
  try {
    storage()?.setItem(MEDITATION_STATS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function readSilentSetup(): SilentSetup {
  const fallback: SilentSetup = { minutes: 10, bed: "rain", intervalMin: 0 };
  const ls = storage();
  if (!ls) return fallback;
  try {
    const p = JSON.parse(ls.getItem(SILENT_SETUP_KEY) ?? "{}") as Partial<SilentSetup>;
    const minutes = SILENT_PRESETS.includes(p.minutes as (typeof SILENT_PRESETS)[number])
      ? (p.minutes as number)
      : 10;
    const bed =
      p.bed === "off" || p.bed === "drone" || p.bed === "bowls" || p.bed === "rain"
        ? p.bed
        : "rain";
    const intervalMin = p.intervalMin === 5 || p.intervalMin === 10 ? p.intervalMin : 0;
    return { minutes, bed, intervalMin };
  } catch {
    return fallback;
  }
}

export function writeSilentSetup(setup: SilentSetup): void {
  try {
    storage()?.setItem(SILENT_SETUP_KEY, JSON.stringify(setup));
  } catch {
    /* ignore */
  }
}

export const SLEEP_EVENINGS_KEY = "mindkshetra-sleep-7";

export function readSleepEvenings(): number[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = JSON.parse(ls.getItem(SLEEP_EVENINGS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7) as number[];
  } catch {
    return [];
  }
}

export function nextSleepEvening(completed: number[]): number {
  const done = completed.filter((n) => n >= 1 && n <= 7);
  if (!done.length) return 1;
  const max = Math.max(...done);
  return max >= 7 ? 7 : max + 1;
}

export function markSleepEvening(day: number): number[] {
  const next = Array.from(new Set([...readSleepEvenings(), day])).sort((a, b) => a - b);
  try {
    storage()?.setItem(SLEEP_EVENINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
