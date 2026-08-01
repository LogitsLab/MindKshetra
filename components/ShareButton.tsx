"use client";

import { track } from "@/lib/track";

type Props = {
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
  /** Verse id, recorded in share_card props for per-verse share analytics. */
  slokaId?: number;
  /** Which card was shared: the verse block or the reflection story block. */
  surface?: "verse" | "story";
};

export default function ShareButton({
  title,
  text,
  url,
  imageUrl,
  slokaId,
  surface,
}: Props) {
  // `path` distinguishes the page the share happened on (/sloka/[id] vs
  // /verse-of-the-day — both render this button through SlokaDetail).
  function recordShare(method: "native" | "copy" | "image") {
    track("share_card", {
      method,
      ...(surface ? { surface } : {}),
      ...(typeof slokaId === "number" ? { slokaId } : {}),
      path: window.location.pathname,
    });
  }

  async function share() {
    const shareData = {
      title,
      text: text.slice(0, 200),
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        recordShare("native");
        return;
      } catch {
        /* fall through */
      }
    }

    await navigator.clipboard.writeText(url);
    recordShare("copy");
    alert("Link copied.");
  }

  function downloadImage() {
    if (!imageUrl) return;
    recordShare("image");
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void share()}
        className="min-h-10 border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
      >
        Share
      </button>
      {imageUrl ? (
        <button
          type="button"
          onClick={downloadImage}
          className="min-h-10 border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
        >
          Image card
        </button>
      ) : null}
    </div>
  );
}
