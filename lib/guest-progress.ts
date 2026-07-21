/** Guest reading progress in localStorage (no auth). */

export const CURSOR_KEY = "mindkshetra-reading-cursor";
export const COMPLETED_KEY = "mindkshetra-completed-verses";

export type GuestCursor = {
  slokaId: number;
  chapter: number;
  updatedAt: string;
};

export type GuestCompletedMap = Record<string, string>;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getGuestCursor(): GuestCursor | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(CURSOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestCursor;
    if (!Number.isInteger(parsed.slokaId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setGuestCursor(slokaId: number, chapter: number): void {
  if (!canUseStorage()) return;
  const payload: GuestCursor = {
    slokaId,
    chapter,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CURSOR_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function getGuestCompletedMap(): GuestCompletedMap {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GuestCompletedMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getGuestCompletedIds(): number[] {
  return Object.keys(getGuestCompletedMap())
    .map(Number)
    .filter((n) => Number.isInteger(n));
}

export function setGuestCompleted(slokaId: number, completed: boolean): void {
  if (!canUseStorage()) return;
  const map = getGuestCompletedMap();
  if (completed) map[String(slokaId)] = new Date().toISOString();
  else delete map[String(slokaId)];
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function setGuestCompletedBulk(
  slokaIds: number[],
  completed: boolean
): void {
  if (!canUseStorage()) return;
  const map = getGuestCompletedMap();
  const now = new Date().toISOString();
  for (const id of slokaIds) {
    if (completed) map[String(id)] = now;
    else delete map[String(id)];
  }
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function clearGuestProgress(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(CURSOR_KEY);
    localStorage.removeItem(COMPLETED_KEY);
  } catch {
    /* ignore */
  }
}

export function guestProgressPayload() {
  const cursor = getGuestCursor();
  return {
    cursor: cursor
      ? { slokaId: cursor.slokaId, chapter: cursor.chapter }
      : null,
    completedIds: getGuestCompletedIds(),
  };
}
