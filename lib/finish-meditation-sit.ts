import { recordMeditationSit, type MeditationStats } from "@/lib/meditation-stats";

const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

function queueGuest(row: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(GUEST_QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    const next = Array.isArray(list) ? [...list, row].slice(-90) : [row];
    localStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Device tally always updates. Signed-in sits also post; guests queue. */
export async function finishMeditationSit(input: {
  sessionId: string;
  durationSec: number;
  moodBefore?: number | null;
  moodAfter?: number | null;
}): Promise<MeditationStats> {
  const stats = recordMeditationSit(input.durationSec);
  const body: Record<string, unknown> = {
    sessionId: input.sessionId,
    durationSec: input.durationSec,
    clientRef: crypto.randomUUID(),
  };
  if (input.moodBefore != null) body.moodBefore = input.moodBefore;
  if (input.moodAfter != null) body.moodAfter = input.moodAfter;
  try {
    body.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch("/api/meditation/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 409) return stats;
    if (!res.ok) queueGuest(body);
  } catch {
    queueGuest(body);
  }
  return stats;
}
