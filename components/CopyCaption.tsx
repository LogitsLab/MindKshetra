"use client";

import { useState } from "react";

export default function CopyCaption({ caption }: { caption: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the textarea is selectable as a fallback */
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        readOnly
        value={caption}
        rows={6}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none border border-white/15 bg-black/20 p-3 text-sm text-[var(--text)]"
      />
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-10 items-center border border-white/25 px-4 py-2 text-sm text-white/80 transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
      >
        {copied ? "Copied ✓" : "Copy caption"}
      </button>
    </div>
  );
}
