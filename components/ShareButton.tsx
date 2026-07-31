"use client";

import { track } from "@/lib/track";

type Props = {
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
};

export default function ShareButton({ title, text, url, imageUrl }: Props) {
  async function share() {
    const shareData = {
      title,
      text: text.slice(0, 200),
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        track("share_card", { method: "native", url });
        return;
      } catch {
        /* fall through */
      }
    }

    await navigator.clipboard.writeText(url);
    track("share_card", { method: "copy", url });
    alert("Link copied.");
  }

  function downloadImage() {
    if (!imageUrl) return;
    track("share_card", { method: "image", url });
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
