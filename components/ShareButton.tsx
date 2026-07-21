"use client";

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
        return;
      } catch {
        /* fall through */
      }
    }

    await navigator.clipboard.writeText(url);
    alert("Link copied.");
  }

  function downloadImage() {
    if (!imageUrl) return;
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
