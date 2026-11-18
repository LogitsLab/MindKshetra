import type { Practice } from "@/lib/sadhana-core";

/**
 * Device-local practice log for visitors with no session. /api/sadhana/merge
 * replays it idempotently (clientRef) when the user signs in.
 */
export const DEVICE_LOG_KEY = "mindkshetra-sadhana-log";

export type DeviceSession = {
  practice: Practice;
  occurredOn: string;
  durationSec?: number;
  count?: number;
  clientRef: string;
};

export function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function newClientRef(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export function localDayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function readDeviceLog(): DeviceSession[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEVICE_LOG_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as DeviceSession[]) : [];
  } catch {
    return [];
  }
}

export function appendDeviceLog(session: DeviceSession): void {
  try {
    const log = [...readDeviceLog(), session].slice(-90);
    localStorage.setItem(DEVICE_LOG_KEY, JSON.stringify(log));
  } catch {
    /* storage unavailable */
  }
}

export function clearDeviceLog(): void {
  try {
    localStorage.removeItem(DEVICE_LOG_KEY);
  } catch {
    /* ignore */
  }
}

type Streak = { current: number; longest: number; graceUsedToday?: boolean };

export async function logPractice(
  body: Record<string, unknown>
): Promise<
  { ok: true; streak: Streak } | { ok: false; reason: "signedOut" | "failed" }
> {
  try {
    const res = await fetch("/api/sadhana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: deviceTimezone(), ...body }),
    });
    if (res.status === 401) return { ok: false, reason: "signedOut" };
    if (!res.ok) return { ok: false, reason: "failed" };
    const data = await res.json();
    return { ok: true, streak: data.streak as Streak };
  } catch {
    return { ok: false, reason: "failed" };
  }
}