"use client";

import { useCallback, useEffect, useState } from "react";

type QueueItem = {
  id: string;
  content_type: string;
  content_id: string;
  reason: string | null;
  source: string;
  created_at: string;
  preview: string | null;
};

/**
 * Maintainer tool — deliberately English-only and plain. Not linked from any
 * nav; the API 404s for non-maintainers, so this page renders an empty queue
 * for anyone who guesses the URL.
 */
export default function ModerationQueueClient() {
  const [items, setItems] = useState<QueueItem[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/moderation")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  useEffect(load, [load]);

  async function resolve(id: string, resolution: "kept" | "removed" | "no_action") {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolution }),
    }).catch(() => {});
    load();
  }

  if (!items) {
    return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        The queue is empty. Good.
      </p>
    );
  }

  return (
    <ul className="space-y-6">
      {items.map((item) => (
        <li key={item.id} className="border-t border-[var(--hairline)] pt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {item.content_type} · {item.source}
            {item.reason ? ` · ${item.reason}` : ""} ·{" "}
            {new Date(item.created_at).toLocaleString("en-IN")}
          </p>
          {item.preview ? (
            <p className="mt-2 border-l-2 border-[var(--hairline)] pl-3 text-[15px] font-light leading-relaxed text-[var(--text)]">
              {item.preview}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {item.content_type} #{item.content_id}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void resolve(item.id, "kept")}
              className="min-h-9 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => void resolve(item.id, "removed")}
              className="min-h-9 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => void resolve(item.id, "no_action")}
              className="min-h-9 px-3 py-1.5 text-sm text-[var(--text-muted)] underline-offset-4 hover:underline"
            >
              No action
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
