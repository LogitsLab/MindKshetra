"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

const PREFS_EVENT = "mindkshetra:prefs";

function authGivenName(user: {
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const meta = user.user_metadata ?? {};
  for (const key of ["full_name", "name", "given_name", "display_name"] as const) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export default function AuthButton() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [streak, setStreak] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loadPrefs = useCallback(() => {
    if (!user || user.is_anonymous) {
      setDisplayName(null);
      setStreak(0);
      return;
    }
    fetch("/api/account/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.displayName === "string" && d.displayName.trim()) {
          setDisplayName(d.displayName.trim());
        } else {
          setDisplayName(null);
        }
      })
      .catch(() => setDisplayName(null));
    fetch("/api/account/streak", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setStreak(d.current ?? 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    function onPrefs() {
      loadPrefs();
    }
    window.addEventListener(PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(PREFS_EVENT, onPrefs);
  }, [loadPrefs]);

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
      displayName ||
      authGivenName(user) ||
      t("account");
    return (
      <Link
        href="/account"
        className="flex min-h-10 max-w-[12rem] items-center gap-2 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
        title={user.email ?? t("account")}
      >
        {streak > 0 ? (
          <span
            className="shrink-0 rounded-sm bg-[var(--brass)]/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--brass-soft)]"
            title={t("homeStreakLabel")}
          >
            {streak}d
          </span>
        ) : null}
        <span className="truncate font-medium text-[var(--text)]">{label}</span>
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
