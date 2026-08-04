"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const WELCOME_KEY = "mindkshetra-welcome-seen";

/** Optional invite only — not a forced multi-step onboarding wizard. */
export default function WelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  function go(path: string) {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* ignore */
    }
    router.push(path);
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
        <div
          className="flex h-16 w-16 items-center justify-center border border-[var(--line)] text-3xl text-[var(--brass-soft)]"
          aria-hidden
        >
          ✦
        </div>
        <h1 className="mt-6 font-display text-4xl tracking-tight text-white sm:text-6xl">
          MindKshetra
        </h1>
        <p className="mt-3 font-display text-lg italic text-[var(--brass-soft)]">
          Your Spiritual Companion
        </p>
        <h2 className="mt-10 max-w-xl font-display text-2xl leading-snug text-white sm:text-3xl">
          Clarity from the Gita, for the battlefield of the mind.
        </h2>
        <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-white/70 sm:text-base">
          You can personalize anytime in Account settings — browsing is always
          open.
        </p>
        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={() => go("/")}
            className="min-h-12 bg-[var(--brass)] px-6 py-3.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            Continue to Home
          </button>
          <button
            type="button"
            onClick={() => go("/account/personalize")}
            className="min-h-12 border border-[var(--line)] bg-black/10 px-6 py-3.5 text-sm text-[var(--brass-soft)] backdrop-blur transition hover:bg-[var(--brass)]/[.07]"
          >
            Open personalize settings
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
