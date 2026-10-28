import { createAdminClient } from "@/lib/supabase/admin";
import { istDayKey, reelFilename } from "@/lib/votd-reel-layout";

const CAPTION_MAX = 1024;
const BUCKET = "audio";

/** Public object key for the one reel already rendered for this IST day. */
export function votdReelObjectPath(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error("votd day must be YYYY-MM-DD");
  }
  return `votd/${day}/${reelFilename()}`;
}

/**
 * Caption for the community announcement: the verse reference, the English
 * line, and the verse page. Short enough to paste into WhatsApp.
 */
export function votdCommunityCaption(input: {
  ref: string;
  english: string;
  verseUrl: string;
}): string {
  const line = input.english.replace(/\s+/g, " ").trim();
  const text = [input.ref.trim(), line, input.verseUrl.trim()]
    .filter(Boolean)
    .join("\n");
  if (text.length <= CAPTION_MAX) return text;
  return `${text.slice(0, CAPTION_MAX - 1)}…`;
}

function publicAudioBase(): string | null {
  const explicit = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!url) return null;
  return `${url}/storage/v1/object/public/audio`;
}

/**
 * Public URL for the reel already stored for this IST day (null when no audio
 * base is configured). /admin/votd-reel links this so the morning post reuses
 * the email's render instead of re-encoding.
 */
export function votdReelPublicUrl(day: string): string | null {
  const base = publicAudioBase();
  if (!base) return null;
  try {
    return `${base}/${votdReelObjectPath(day)}`;
  } catch {
    return null;
  }
}

export type PublishedVotdReel = {
  day: string;
  url: string;
  caption: string;
};

/**
 * Store the reel the morning email already encoded. A failed upload must not
 * stop the broadcast; the caller keeps sending the letter.
 */
export async function publishVotdReel(input: {
  bytes: Buffer;
  caption: string;
  day?: string;
}): Promise<PublishedVotdReel | null> {
  if (input.bytes.length === 0) return null;
  const day = input.day ?? istDayKey();
  let path: string;
  try {
    path = votdReelObjectPath(day);
  } catch (err) {
    console.warn("[votd-community]", err instanceof Error ? err.message : err);
    return null;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.storage.from(BUCKET).upload(path, input.bytes, {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "86400",
    });
    if (error) {
      console.warn("[votd-community] upload", error.message);
      return null;
    }
    const base = publicAudioBase();
    if (!base) {
      console.warn("[votd-community] public url unavailable");
      return null;
    }
    const published = { day, url: `${base}/${path}`, caption: input.caption };
    console.info("[votd-community]", published);
    return published;
  } catch (err) {
    console.warn("[votd-community]", err instanceof Error ? err.message : err);
    return null;
  }
}
