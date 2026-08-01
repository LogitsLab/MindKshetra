"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import Skeleton from "@/components/Skeleton";

const PREFS_EVENT = "mindkshetra:prefs";
const NAV_CACHE_KEY = "mindkshetra-nav-prefs";
const NAV_CACHE_TTL_MS = 15 * 60 * 1000;
const STREAK_DAY_KEY = "mindkshetra-streak-day";

type NavCache = {
  userId: string;
  displayName: string | null;
  streak: number;
  at: number;
};

function readNavCache(userId: string): NavCache | null {
  try {
    const raw = sessionStorage.getItem(NAV_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as NavCache;
    if (cache.userId !== userId) return null;
    if (Date.now() - cache.at > NAV_CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

function localDayStamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

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

  const loadPrefs = useCallback(
    (force = false) => {
      if (!user || user.is_anonymous) {
        setDisplayName(null);
        setStreak(0);
        return;
      }

      if (!force) {
        const cached = readNavCache(user.id);
        if (cached) {
          setDisplayName(cached.displayName);
          setStreak(cached.streak);
          return;
        }
      }

      // The streak day only advances via POST; once it has been recorded for
      // today's local date, display reads stay on GET.
      const today = localDayStamp();
      const streakRecorded = localStorage.getItem(STREAK_DAY_KEY) === today;

      Promise.all([
        fetch("/api/account/preferences")
          .then((r) => r.json())
          .then((d) =>
            typeof d.displayName === "string" && d.displayName.trim()
              ? d.displayName.trim()
              : null
          )
          .catch(() => null),
        fetch("/api/account/streak", {
          method: streakRecorded ? "GET" : "POST",
        })
          .then((r) => r.json())
          .then((d) => {
            if (!streakRecorded) localStorage.setItem(STREAK_DAY_KEY, today);
            return typeof d.current === "number" ? d.current : 0;
          })
          .catch(() => 0),
      ]).then(([name, current]) => {
        setDisplayName(name);
        setStreak(current);
        try {
          sessionStorage.setItem(
            NAV_CACHE_KEY,
            JSON.stringify({
              userId: user.id,
              displayName: name,
              streak: current,
              at: Date.now(),
            } satisfies NavCache)
          );
        } catch {
          // Storage full/unavailable — cache is best-effort only.
        }
      });
    },
    [user]
  );

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    function onPrefs() {
      loadPrefs(true);
    }
    window.addEventListener(PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(PREFS_EVENT, onPrefs);
  }, [loadPrefs]);

  if (loading) {
    return (
      <Skeleton block className="h-9 w-16" />
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
