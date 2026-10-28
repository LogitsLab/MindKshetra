import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CopyCaption from "@/components/CopyCaption";
import { communityLinksFromEnv } from "@/lib/community-links";
import { isMaintainer } from "@/lib/maintainers";
import { getSignedInUserId } from "@/lib/supabase/server";
import { buildVotdCaption } from "@/lib/votd-caption";
import { loadTodaysVotdPayload } from "@/lib/votd-email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily reel · MindKshetra",
  robots: { index: false, follow: false },
};

/**
 * Maintainer-only helper for the daily WhatsApp community post: download
 * today's reel + copy a ready caption, then post it by hand (WhatsApp has no
 * API to auto-post into a community).
 */
export default async function VotdReelAdminPage() {
  const userId = await getSignedInUserId();
  if (!isMaintainer(userId)) notFound();

  const payload = await loadTodaysVotdPayload();
  const whatsapp = communityLinksFromEnv(process.env).whatsapp;
  const caption = payload
    ? buildVotdCaption(payload, { whatsappUrl: whatsapp })
    : "";

  return (
    <div className="animate-fade mx-auto max-w-2xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          Maintainers
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)]">
          Today&rsquo;s reel
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {payload
            ? `Bhagavad Gītā ${payload.ref}. `
            : "Today's verse is unavailable. "}
          Download the video and post it to the WhatsApp community with the
          caption below.
        </p>
      </header>

      {payload ? (
        <div className="space-y-6">
          <a
            href="/api/votd/reel"
            className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            Download today&rsquo;s reel (.mp4)
          </a>
          <p className="text-xs text-[var(--text-muted)]">
            A 503 means the reel didn&rsquo;t render today (missing recitation
            or encode failure) — the email falls back to text, so skip the video
            and post the caption alone.
          </p>

          <CopyCaption caption={caption} />

          {!whatsapp ? (
            <p className="text-xs text-[var(--text-muted)]">
              Set <code>NEXT_PUBLIC_WHATSAPP_CHANNEL_URL</code> to include the
              community invite in the caption.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
