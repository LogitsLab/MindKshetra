import catalog from "@/data/meditation/audio-catalog.json";
import type { MeditationSession } from "@/lib/meditation-core";

export type SleepTrack = {
  id: string;
  kind: "ambient";
  shelf: "sleep";
  durationSec: number;
  title_en: string;
  title_hi: string;
  src: string;
  license: string;
  credit: string;
  sourceUrl: string;
};

const tracks = (catalog as { tracks: SleepTrack[] }).tracks;

export function sleepTracks(): SleepTrack[] {
  return tracks;
}

export function sleepTrackById(id: string): SleepTrack | null {
  return tracks.find((t) => t.id === id) ?? null;
}

const SILENT_MINUTES = [5, 10, 15, 20, 30, 45] as const;

/** Stable ids the complete API can resolve without a course day. */
export function adHocMeditationSession(sessionId: string): MeditationSession | null {
  const silent = /^silent-(\d+)$/.exec(sessionId);
  if (silent) {
    const minutes = Number(silent[1]);
    if (!(SILENT_MINUTES as readonly number[]).includes(minutes)) return null;
    return {
      id: sessionId,
      day_number: 0,
      tier: "daily",
      track: null,
      unlock_rule: "always",
      audio_url: null,
      duration_minutes: minutes,
      title_en: `${minutes} minute silent sit`,
      title_hi: `${minutes} मिनट मौन बैठक`,
      theme_en: "A timer, a bell, and the seat.",
      theme_hi: "एक घड़ी, एक घंटा, और आसन।",
      phases: [{ type: "silence", seconds: minutes * 60 }],
    };
  }

  const bed = /^sleep-bed-([a-z0-9-]+)-(\d+|full)$/.exec(sessionId);
  if (bed) {
    const track = sleepTrackById(bed[1]);
    if (!track) return null;
    const full = bed[2] === "full";
    const minutes = full
      ? Math.max(1, Math.round(track.durationSec / 60))
      : Number(bed[2]);
    if (!full && ![15, 30, 45].includes(minutes)) return null;
    return {
      id: sessionId,
      day_number: 0,
      tier: "daily",
      track: "sleep",
      unlock_rule: "always",
      audio_url: track.src,
      duration_minutes: minutes,
      title_en: track.title_en,
      title_hi: track.title_hi,
      theme_en: track.credit,
      theme_hi: track.credit,
      phases: [{ type: "silence", seconds: minutes * 60 }],
    };
  }
  return null;
}
