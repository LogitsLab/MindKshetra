"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

type Entry = {
  id: number;
  reflection: string;
  kind: string;
  sloka_id: number | null;
  created_at: string;
};

const KINDS = ["all", "reflection", "gratitude", "insight", "verse"] as const;

export default function JournalPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [writeKind, setWriteKind] = useState<"reflection" | "gratitude" | "insight">(
    "reflection"
  );
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user || user.is_anonymous) return;
    const q = kind === "all" ? "" : `?kind=${kind}`;
    const res = await fetch(`/api/journal${q}`);
    if (!res.ok) return;
    const body = await res.json();
    setEntries(body.entries ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, kind]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || user.is_anonymous) return;
    setBusy(true);
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection: text.trim(), kind: writeKind }),
    });
    setText("");
    setBusy(false);
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl py-6">
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="relative flex min-h-[440px] flex-col justify-end overflow-hidden rounded-xl border border-[var(--line)] p-7 sm:p-10 lg:col-span-8">
          <div className="absolute inset-0 bg-[url('/images/paths/meditation.jpg')] bg-cover bg-center opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--void)] via-[rgba(7,9,15,.55)] to-transparent" />
          <div className="relative">
            <p className="eyebrow text-[var(--brass-soft)]">Verse of the day · Sādhana</p>
            <p className="mt-4 font-devanagari text-2xl leading-relaxed text-[var(--brass-soft)]">
              योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-3xl italic leading-tight text-white sm:text-4xl">
              “Perform your duty equipoised, abandoning attachment to success or failure.”
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sadhana" className="bg-[var(--brass)] px-6 py-3 text-xs font-semibold uppercase tracking-[.12em] text-[var(--on-brass)]">
                Begin silent sit
              </Link>
              <a href="#journal-composer" className="border border-white/25 bg-black/15 px-6 py-3 text-xs font-semibold uppercase tracking-[.12em] text-white">
                One honest line
              </a>
            </div>
          </div>
        </section>

        <aside className="glass rounded-xl p-6 sm:p-8 lg:col-span-4 lg:row-span-2" id="journal-composer">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-[var(--brass-soft)]">Private practice</p>
              <h2 className="mt-2 font-display text-3xl">{L === "hi" ? "जर्नल" : "The Void Journal"}</h2>
            </div>
            <span className="text-[var(--brass-soft)]">✎</span>
          </div>
          {!user || user.is_anonymous ? (
            <p className="mt-8 text-sm leading-relaxed text-[var(--text-soft)]">
              Sign in to keep a private journal.{" "}
              <Link href="/account" className="text-[var(--brass-soft)]">Account</Link>
            </p>
          ) : (
            <>
              <form onSubmit={onSave} className="mt-7">
                <div className="flex flex-wrap gap-2">
                  {(["reflection", "gratitude", "insight"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setWriteKind(k)}
                      className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-wider ${
                        writeKind === k ? "border-[var(--brass)] text-[var(--brass-soft)]" : "border-[var(--hairline)] text-[var(--text-muted)]"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  className="mt-5 w-full resize-none border-0 border-b border-[var(--brass)]/30 bg-transparent px-0 py-3 text-[var(--text)] outline-none focus:border-[var(--brass)]"
                  placeholder={L === "hi" ? "आज की ईमानदार पंक्ति…" : "Enter the void…"}
                />
                <div className="mt-4 flex justify-end">
                  <button type="submit" disabled={busy || !text.trim()} className="bg-[var(--brass)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--on-brass)] disabled:opacity-50">
                    {busy ? "…" : L === "hi" ? "सहेजें" : "Save"}
                  </button>
                </div>
              </form>
              <div className="mt-8 flex flex-wrap gap-2 border-t border-[var(--hairline)] pt-6">
                {KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)} className={`text-[9px] uppercase tracking-widest ${kind === k ? "text-[var(--brass-soft)]" : "text-[var(--text-muted)]"}`}>
                    {k}
                  </button>
                ))}
              </div>
              <ul className="mt-4 max-h-[24rem] overflow-y-auto">
                {entries.map((entry) => (
                  <li key={entry.id} className="border-b border-[var(--hairline)] py-4">
                    <div className="flex justify-between text-[9px] uppercase tracking-widest">
                      <span className="text-[var(--text-muted)]">{new Date(entry.created_at).toLocaleDateString()}</span>
                      <span className="text-[var(--brass-soft)]">{entry.kind}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm italic leading-relaxed text-[var(--text-soft)]">{entry.reflection}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <section className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
          <Link href="/sadhana#japa" className="glass rounded-xl p-8 text-center">
            <p className="eyebrow text-[var(--text-muted)]">Current Japa Mala</p>
            <p className="mt-5 font-display text-7xl text-[var(--brass-soft)]">108</p>
            <p className="mt-6 border border-[var(--brass)]/35 py-3 text-xs uppercase tracking-wider text-[var(--brass-soft)]">Continue focus</p>
          </Link>
          <Link href="/meditation" className="glass flex flex-col justify-between rounded-xl p-8">
            <div>
              <p className="eyebrow text-[var(--text-muted)]">Active path</p>
              <h2 className="mt-4 font-display text-3xl">Day 12 of 45</h2>
              <p className="mt-2 text-sm text-[var(--text-soft)]">Inner Resonance: The Sound of Breath</p>
            </div>
            <div className="mt-10 h-px bg-[var(--hairline)]">
              <div className="h-px w-[26%] bg-[var(--brass)]" />
            </div>
          </Link>
        </section>
      </div>
    </main>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account" className="text-sm text-[var(--text-muted)]">
        ← Account
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        {L === "hi" ? "जर्नल" : "Journal"}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        {L === "hi"
          ? "निजी चिंतन, कृतज्ञता और सीख।"
          : "Private reflections, gratitude, and insights."}
      </p>

      {!user || user?.is_anonymous ? (
        <p className="mt-6 text-[var(--text-soft)]">
          Sign in to keep a journal.{" "}
          <Link href="/account" className="text-[var(--brass)]">
            Account
          </Link>
        </p>
      ) : (
        <>
          <form onSubmit={onSave} className="mt-8 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["reflection", "gratitude", "insight"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setWriteKind(k)}
                  className={`rounded border px-3 py-1 text-xs uppercase tracking-wide ${
                    writeKind === k
                      ? "border-[var(--brass)] text-[var(--brass-soft)]"
                      : "border-[var(--line)] text-[var(--text-muted)]"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]"
              placeholder={
                L === "hi" ? "आज की ईमानदार पंक्ति…" : "An honest line for today…"
              }
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded-md border border-[var(--brass)]/40 bg-[var(--brass)]/15 px-4 py-2 text-sm text-[var(--brass-soft)] disabled:opacity-50"
            >
              {L === "hi" ? "सहेजें" : "Save entry"}
            </button>
          </form>

          <div className="mt-10 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded border px-3 py-1 text-xs uppercase tracking-wide ${
                  kind === k
                    ? "border-[var(--brass)] text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)]"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <ul className="mt-6 space-y-3">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  {e.kind}
                  {e.sloka_id != null ? ` · sloka ${e.sloka_id}` : ""} ·{" "}
                  {new Date(e.created_at).toLocaleDateString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[var(--text-soft)]">
                  {e.reflection}
                </p>
              </li>
            ))}
            {!entries.length ? (
              <li className="text-sm text-[var(--text-muted)]">
                {L === "hi" ? "अभी कोई प्रविष्टि नहीं।" : "No entries yet."}
              </li>
            ) : null}
          </ul>
        </>
      )}
    </main>
  );
}
