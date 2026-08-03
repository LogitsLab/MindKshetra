"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Payload = {
  date: string;
  disclaimer: string;
  muhurats: Array<{
    nameEn: string;
    nameHi: string;
    startIso: string;
    endIso: string;
    tag: string;
  }>;
  choghadiya: Array<{
    kind: string;
    startIso: string;
    endIso: string;
    quality: string;
  }>;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MuhuratPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/astrology/muhurat")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Unavailable");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/astrology" className="text-sm text-[var(--text-muted)]">
        ← Astrology
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        Muhurats
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Auspicious windows for the day — lifestyle layer pending accuracy review.
      </p>
      {error ? (
        <p className="mt-6 text-sm text-red-400">{error}</p>
      ) : !data ? (
        <p className="mt-6 text-[var(--text-muted)]">Loading…</p>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-xs text-[var(--text-muted)]">{data.disclaimer}</p>
          <p className="text-sm text-[var(--text-soft)]">Date · {data.date}</p>
          {data.muhurats.map((m) => (
            <div
              key={m.nameEn}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[var(--text)]">{m.nameEn}</p>
                <span className="text-xs text-[var(--brass-soft)]">{m.tag}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                {fmt(m.startIso)} – {fmt(m.endIso)}
              </p>
            </div>
          ))}
          <div>
            <p className="eyebrow text-[var(--brass)]">Choghadiya</p>
            <ul className="mt-3 space-y-2">
              {data.choghadiya.map((c) => (
                <li
                  key={c.startIso}
                  className="flex justify-between rounded border border-[var(--hairline)] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--text)]">
                    {c.kind}{" "}
                    <span className="text-[var(--text-muted)]">({c.quality})</span>
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {fmt(c.startIso)}–{fmt(c.endIso)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
