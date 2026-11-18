/**
 * Optional bridge: completing a meditation / daily sit can count as the
 * silence leg of today’s sādhana when the seeker opts in.
 */
export const SIT_CREDIT_KEY = "mindkshetra-sit-credit";

export type SitCredit = {
  day: string;
  source: "meditation" | "daily-sit";
  durationSec: number;
};

function localDayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function writeSitCredit(
  source: SitCredit["source"],
  durationSec: number
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SitCredit = {
      day: localDayStamp(),
      source,
      durationSec: Math.max(1, Math.floor(durationSec)),
    };
    localStorage.setItem(SIT_CREDIT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readTodaySitCredit(): SitCredit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SIT_CREDIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SitCredit;
    if (!parsed?.day || parsed.day !== localDayStamp()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSitCredit(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SIT_CREDIT_KEY);
  } catch {
    /* ignore */
  }
}
