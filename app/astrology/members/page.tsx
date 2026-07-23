"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { AstrologyMember } from "@/lib/astrology/types";

type MemberRow = AstrologyMember & { currentMahaLord?: string | null };

export default function AstrologyMembersPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const signedIn = Boolean(user && !user.is_anonymous);

  const load = useCallback(async () => {
    const res = await fetch("/api/astrology/members");
    if (res.status === 401) {
      router.push("/account");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setMembers(data.members || []);
  }, [router]);

  useEffect(() => {
    if (loading) return;
    if (!signedIn) {
      router.push("/account");
      return;
    }
    load().catch(() => setError("Failed to load"));
  }, [loading, signedIn, router, load]);

  async function remove(id: string) {
    const res = await fetch(`/api/astrology/members/${id}`, { method: "DELETE" });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== id));
  }

  if (loading || !signedIn) {
    return (
      <p className="py-20 text-center text-sm text-[var(--text-muted)]">
        {t("loading")}
      </p>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl space-y-10 py-10 sm:py-14 animate-fade">
      <div
        className="pointer-events-none absolute -right-8 top-0 select-none font-display text-[6rem] leading-none text-white/[0.04] sm:text-[8rem]"
        aria-hidden
      >
        कुण्डली
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brass-soft)]">
            {t("astroEyebrow")}
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight text-[var(--text)] sm:text-5xl">
            {t("astroMembersTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
            {t("astroMembersBlurb")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/astrology"
            className="border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/40 hover:text-[var(--text)]"
          >
            {t("astroCastQuick")}
          </Link>
          <Link
            href="/astrology/members/new"
            className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            {t("astroAddMember")}
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {members.length === 0 ? (
        <div className="border-y border-[var(--hairline)] py-12 text-center">
          <p className="text-[var(--text-muted)]">{t("astroEmptyMembers")}</p>
          <Link
            href="/astrology/members/new"
            className="mt-4 inline-block text-sm text-[var(--brass-soft)] underline-offset-4 hover:underline"
          >
            {t("astroAddMember")}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-4 py-5 transition hover:bg-[var(--brass)]/[0.03]"
            >
              <div className="min-w-0">
                <p className="font-display text-xl text-[var(--text)]">{m.name}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {t(`astroRel_${m.relationship}` as "astroRel_self")} · {m.dob}
                  <span className="hidden sm:inline"> · {m.placeLabel}</span>
                </p>
                {m.currentMahaLord ? (
                  <p className="mt-1 text-xs text-[var(--brass-soft)]">
                    {t("astroLastMaha")}: {m.currentMahaLord}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/astrology/members/${m.id}`}
                  className="bg-[var(--brass)]/15 px-3.5 py-2 text-sm text-[var(--brass-soft)] transition hover:bg-[var(--brass)]/25"
                >
                  {t("astroOpen")}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="px-3 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
                >
                  {t("astroRemove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
