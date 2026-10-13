import "server-only";

import type { Sloka } from "@/lib/types";
import type { VotdPayload } from "@/lib/votd-email";
import {
  applyAttachmentNote,
  attachmentNote,
  reelFilename,
} from "@/lib/votd-reel-layout";

export type VotdEmailAttachment = {
  filename: string;
  /** Base64, the form Resend's JSON API accepts. */
  content: string;
};

/**
 * Same bucket rule as lib/audio/manifest.ts. That module is client-only, so
 * the daily job keeps its own copy rather than pulling the browser bundle
 * into the cron.
 */
function audioBucketBase(): string | null {
  const explicit = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!url) return null;
  return `${url}/storage/v1/object/public/audio`;
}

async function downloadRecitation(sloka: Sloka): Promise<Buffer | null> {
  const base = audioBucketBase();
  if (!base) return null;
  const url = `${base}/recitation/${sloka.chapter}-${sloka.verse_number}.m4a`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  return bytes.length > 0 ? bytes : null;
}

/**
 * Build today's reel once, for every copy of the verse email. The recitation
 * is muxed into the video and is not attached on its own. A missing reel
 * must not stop the broadcast.
 */
export async function withVotdAttachments(payload: VotdPayload): Promise<{
  payload: VotdPayload;
  attachments: VotdEmailAttachment[];
}> {
  const started = Date.now();
  try {
    const audio = await downloadRecitation(payload.sloka);
    if (!audio) {
      console.warn("[votd-reel] recitation unavailable", payload.ref);
      return { payload, attachments: [] };
    }

    const attachments: VotdEmailAttachment[] = [];

    try {
      const { renderVotdReel } = await import("@/lib/votd-reel");
      // The production function allows 300s. Keep most of that for the
      // encode so a slow machine still attaches the reel, and leave the
      // remainder for the send loop.
      const video = await renderVotdReel({
        sloka: payload.sloka,
        ref: payload.ref,
        audio,
        signal: AbortSignal.timeout(240_000),
      });
      attachments.push({
        filename: reelFilename(),
        content: video.toString("base64"),
      });
    } catch (err) {
      console.warn(
        "[votd-reel] video skipped",
        err instanceof Error ? err.message : err
      );
    }

    const note = attachmentNote(attachments.length > 0);
    const noted = applyAttachmentNote(payload.html, payload.text, note);
    console.info("[votd-reel]", {
      ref: payload.ref,
      files: attachments.map((file) => file.filename),
      ms: Date.now() - started,
    });
    return {
      payload: { ...payload, html: noted.html, text: noted.text },
      attachments,
    };
  } catch (err) {
    console.warn("[votd-reel]", err instanceof Error ? err.message : err);
    return { payload, attachments: [] };
  }
}
