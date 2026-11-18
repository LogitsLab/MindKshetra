"use client";

import { track } from "@/lib/track";

type Props = {
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
  /** 1080×1920 Stories / Reels still */
  storiesImageUrl?: string;
  /** Verse id, recorded in share_card props for per-verse share analytics. */
  slokaId?: number;
  /** Which card was shared: the verse block or the reflection story block. */
  surface?: "verse" | "story";
  shareLabel?: string;
  imageLabel?: string;
  storiesLabel?: string;
  /** Quiet text links instead of bordered buttons. */
  quiet?: boolean;
};

export default function ShareButton({
  title,
  text,
  url,
  imageUrl,
  storiesImageUrl,
  slokaId,
  surface,
  shareLabel = "Share",
  imageLabel = "Card",
  storiesLabel = "Stories",
  quiet = false,
}: Props) {
  function recordShare(method: "native" | "copy" | "image" | "stories") {
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

  function openImage(href: string, method: "image" | "stories") {
    recordShare(method);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const buttonClass = quiet
    ? "inline-flex h-8 items-center text-sm leading-none text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
    : "min-h-10 border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]";

  const links = (
    <>
      <button type="button" onClick={() => void share()} className={buttonClass}>
        {shareLabel}
      </button>
      {imageUrl ? (
        <>
          {quiet ? (
            <span className="select-none text-[var(--text-muted)]/35" aria-hidden>
              ·
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => openImage(imageUrl, "image")}
            className={buttonClass}
          >
            {imageLabel}
          </button>
        </>
      ) : null}
      {storiesImageUrl ? (
        <>
          {quiet ? (
            <span className="select-none text-[var(--text-muted)]/35" aria-hidden>
              ·
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => openImage(storiesImageUrl, "stories")}
            className={buttonClass}
          >
            {storiesLabel}
          </button>
        </>
      ) : null}
    </>
  );

  if (quiet) return links;

  return <div className="flex flex-wrap items-center gap-2">{links}</div>;
}
