/**
 * Device-local japa tally (web), mirroring mobile AsyncStorage key shape.
 * Lifetime malas = floor(beads / 108). Day rolls at local midnight.
 */
export const JAPA_STATS_KEY = "mindkshetra-japa-stats";
export const JAPA_DAILY_GOAL = 108;

export type JapaStats = {
  lifetimeBeads: number;
  dayStamp: string;
  dayBeads: number;
};

export function localDayStamp(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function emptyJapaStats(now = new Date()): JapaStats {
  return { lifetimeBeads: 0, dayStamp: localDayStamp(now), dayBeads: 0 };
}

function browserStorage(): Storage | null {
  try {
    if (typeof globalThis === "undefined") return null;
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return null;
    return ls;
  } catch {
    return null;
  }
}

export function readJapaStats(): JapaStats {
  const ls = browserStorage();
  const today = localDayStamp();
  if (!ls) return emptyJapaStats();
  try {
    const raw = ls.getItem(JAPA_STATS_KEY);
    if (!raw) return emptyJapaStats();
    const p = JSON.parse(raw) as Partial<JapaStats>;
    const lifetimeBeads =
      typeof p.lifetimeBeads === "number" && p.lifetimeBeads >= 0
        ? Math.floor(p.lifetimeBeads)
        : 0;
    const sameDay = p.dayStamp === today;
    const dayBeads =
      sameDay && typeof p.dayBeads === "number" && p.dayBeads >= 0
        ? Math.floor(p.dayBeads)
        : 0;
    return { lifetimeBeads, dayStamp: today, dayBeads };
  } catch {
    return emptyJapaStats();
  }
}

export function recordJapaBeads(count: number): JapaStats {
  const cur = readJapaStats();
  if (!Number.isFinite(count) || count <= 0) return cur;
  const next: JapaStats = {
    lifetimeBeads: cur.lifetimeBeads + Math.floor(count),
    dayStamp: localDayStamp(),
    dayBeads: cur.dayBeads + Math.floor(count),
  };
  const ls = browserStorage();
  if (!ls) return next;
  try {
    ls.setItem(JAPA_STATS_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}
