"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

export default function AuthButton() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) {
      setStreak(0);
      return;
    }
    fetch("/api/account/streak", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setStreak(d.current ?? 0))
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <span
        className="inline-block h-9 w-16 animate-pulse border border-[var(--line)] bg-[var(--surface)]"
        aria-hidden
      />
    );
  }

  if (user && !user.is_anonymous) {
    const label =
      user.email?.split("@")[0] ?? t("account");
    return (
      <Link
        href="/account"
        className="flex min-h-10 max-w-[10rem] items-center gap-2 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
        title={user.email ?? t("account")}
      >
        {streak > 0 ? (
          <span className="shrink-0 text-xs text-[var(--brass-soft)]">
            {streak}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  if (user?.is_anonymous) {
    return (
      <Link
        href="/account"
        className="min-h-10 border border-[var(--line)] px-3 py-2 text-xs text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
      >
        {t("guestBadge")}
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      className="min-h-10 border border-[var(--brass)]/50 bg-[var(--brass)]/10 px-3 py-2 text-xs font-medium tracking-wide text-[var(--brass-soft)] transition hover:bg-[var(--brass)]/20"
    >
      {t("signIn")}
    </Link>
  );
}
