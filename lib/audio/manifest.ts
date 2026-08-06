"use client";

import { speechHash } from "@/lib/audio/hash";

/**
 * Client view of the audio bucket's manifest.json — the table of
 * pre-generated narration (keyed by speech-text hash) and Sanskrit
 * recitation (keyed "chapter-verse"). Absence of the manifest or a key means
 * "fall back to device TTS", never an error.
 */
export type AudioManifest = {
  version: number;
  tts: { en: Record<string, string>; hi: Record<string, string> };
  recitation: Record<string, string>;
};

let cached: AudioManifest | null | undefined;
let inflight: Promise<AudioManifest | null> | null = null;

function bucketBase(): string | null {
  // Prefer an explicit audio bucket — production keeps recitation/TTS on a
  // dedicated project while the app DB may live elsewhere (.env.local).
  const explicit = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!url) return null;
  return `${url}/storage/v1/object/public/audio`;
}

export async function getAudioManifest(): Promise<AudioManifest | null> {
  if (cached !== undefined) return cached;
  if (inflight) return inflight;
  const base = bucketBase();
  if (!base) {
    cached = null;
    return null;
  }
  // Default HTTP cache — bucket Cache-Control (1 day) is the source of truth.
  // Avoid no-cache: it forced revalidation on every page and burned egress.
  inflight = fetch(`${base}/manifest.json`)
    .then(async (res) => (res.ok ? ((await res.json()) as AudioManifest) : null))
    .catch(() => null)
    .then((manifest) => {
      cached = manifest;
      inflight = null;
      return manifest;
    });
  return inflight;
}

/** Pre-generated narration URL for exactly this text, or null. */
export async function resolveSpeechUrl(
  text: string,
  lang: "en" | "hi"
): Promise<string | null> {
  const [manifest, base] = [await getAudioManifest(), bucketBase()];
  if (!manifest || !base) return null;
  const path = manifest.tts?.[lang]?.[speechHash(text)];
  return path ? `${base}/${path}` : null;
}

/** Sanskrit recitation URL for a verse, or null. */
export async function resolveRecitationUrl(
  chapter: number,
  verse: number
): Promise<string | null> {
  const [manifest, base] = [await getAudioManifest(), bucketBase()];
  if (!manifest || !base) return null;
  const path = manifest.recitation?.[`${chapter}-${verse}`];
  return path ? `${base}/${path}` : null;
}
