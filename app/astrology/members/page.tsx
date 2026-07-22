"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { AstrologyMember } from "@/lib/astrology/types";

export default function AstrologyMembersPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<AstrologyMember[]>([]);
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
      <p className="py-12 text-center text-[var(--text-muted)]">{t("loading")}</p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--brass-soft)]">
            {t("astroEyebrow")}
          </p>
          <h1 className="font-display text-3xl text-[var(--text)] sm:text-4xl">
            {t("astroMembersTitle")}
          </h1>
        </div>
        <Link
          href="/astrology/members/new"
          className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)]"
        >
          {t("astroAddMember")}
        </Link>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {members.length === 0 ? (
        <p className="text-[var(--text-muted)]">{t("astroEmptyMembers")}</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-[var(--line)] px-4 py-4"
            >
              <div>
                <p className="font-medium text-[var(--text)]">{m.name}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {t(`astroRel_${m.relationship}` as "astroRel_self")} · {m.dob} ·{" "}
                  {m.placeLabel}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/astrology/members/${m.id}`}
                  className="border border-[var(--brass)]/40 px-3 py-2 text-sm text-[var(--brass-soft)]"
                >
                  {t("astroOpen")}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)]"
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
