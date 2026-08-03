"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const WELCOME_KEY = "mindkshetra-welcome-seen";

export default function WelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(WELCOME_KEY) === "1") {
        router.replace("/");
        return;
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [router]);

  function dismiss(goPersonalize: boolean) {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* ignore */
    }
    router.push(goPersonalize ? "/account/personalize" : "/");
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-6">
        <p className="text-sm text-[var(--text-muted)]">…</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-6 py-20 text-center">
      <div className="absolute inset-0 bg-[url('/images/hero.jpg')] bg-cover bg-center opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,9,15,.5)] via-[rgba(7,9,15,.72)] to-[var(--void)]" />
      <section className="animate-rise relative z-10 flex w-full max-w-2xl flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--brass)]/35 text-3xl text-[var(--brass-soft)] shadow-[0_0_50px_rgba(201,162,39,.12)]">
          ॐ
        </div>
        <h1 className="mt-6 font-display text-4xl uppercase tracking-[0.16em] text-white sm:text-6xl">
          MindKshetra
        </h1>
        <p className="mt-3 font-display text-lg italic tracking-[0.18em] text-[var(--brass-soft)]">
          Your Spiritual Companion
        </p>
        <h2 className="mt-10 max-w-xl font-display text-2xl leading-snug text-white sm:text-4xl">
          Clarity from the Gita, for the battlefield of the mind.
        </h2>
        <p className="mt-5 text-sm font-light leading-relaxed text-white/65 sm:text-base">
          Optional personalization in about a minute — guest browsing always allowed.
        </p>
        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={() => dismiss(true)}
          className="rounded-lg bg-[var(--brass)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--on-brass)] shadow-[0_0_30px_rgba(201,162,39,.15)] transition hover:bg-[var(--brass-soft)]"
        >
          Personalize in 1 minute
        </button>
        <button
          type="button"
          onClick={() => dismiss(false)}
          className="rounded-lg border border-[var(--brass)]/35 bg-black/10 px-6 py-4 text-sm font-medium uppercase tracking-[0.14em] text-[var(--brass-soft)] backdrop-blur transition hover:bg-[var(--brass)]/[.07]"
        >
          Continue to Home
        </button>
        <Link
          href="/account"
          className="mt-2 text-center text-sm text-white/55 underline-offset-4 hover:text-[var(--brass-soft)] hover:underline"
        >
          Sign in
        </Link>
      </div>
      </section>
    </main>
  );
}
