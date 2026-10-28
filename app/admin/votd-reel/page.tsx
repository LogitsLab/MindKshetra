import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CopyCaption from "@/components/CopyCaption";
import { isMaintainer } from "@/lib/maintainers";
import { getSignedInUserId } from "@/lib/supabase/server";
import {
  votdCommunityCaption,
  votdReelPublicUrl,
} from "@/lib/votd-community";
import { loadTodaysVotdPayload } from "@/lib/votd-email";
import { istDayKey } from "@/lib/votd-reel-layout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily reel · MindKshetra",
  robots: { index: false, follow: false },
};

/**
 * Maintainer-only helper for the daily WhatsApp community post. The morning
 * broadcast stores today's reel; this links it + a ready caption so the post
 * is manual but ~10s (WhatsApp has no API to auto-post into a community).
 */
export default async function VotdReelAdminPage() {
  const userId = await getSignedInUserId();
  if (!isMaintainer(userId)) notFound();

  const payload = await loadTodaysVotdPayload();
  const storedUrl = votdReelPublicUrl(istDayKey());
  const caption = payload
    ? votdCommunityCaption({
        ref: payload.ref,
        english: payload.sloka.english_translation,
        verseUrl: `${payload.site}/sloka/${payload.sloka.id}`,
      })
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
          Download the reel and post it to the WhatsApp community with the
          caption below.
        </p>
      </header>

      {payload ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {storedUrl ? (
              <a
                href={storedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
              >
                Download today&rsquo;s reel (.mp4)
              </a>
            ) : null}
            <a
              href="/api/votd/reel"
              className="inline-flex min-h-12 items-center border border-white/25 px-5 py-3 text-sm text-white/80 transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
            >
              {storedUrl
                ? "Render now (if the stored one 404s)"
                : "Render today’s reel (.mp4)"}
            </a>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            The stored reel is the exact file the 8:00 IST email sent. If it
            404s (broadcast hasn&rsquo;t run or the upload failed), use
            &ldquo;Render now&rdquo;.
          </p>

          <CopyCaption caption={caption} />
        </div>
      ) : null}
    </div>
  );
}
