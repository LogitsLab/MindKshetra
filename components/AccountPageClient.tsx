"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

export default function AccountPageClient() {
  const {
    user,
    loading,
    configured,
    signInWithGoogle,
    signInWithEmail,
    signInAnonymously,
    signOut,
  } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "guest" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [votdEmail, setVotdEmail] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [votdConfigured, setVotdConfigured] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user || user.is_anonymous) {
      setStreak(0);
      setVotdConfigured(false);
      return;
    }
    fetch("/api/account/streak", { method: "GET" })
      .then((r) => r.json())
      .then((d) => setStreak(Number(d.current) || 0))
      .catch(() => {});
    fetch("/api/votd/email")
      .then((r) => r.json())
      .then((d) => setVotdConfigured(Boolean(d.configured)))
      .catch(() => setVotdConfigured(false));
  }, [user]);

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const result = await signInWithEmail(email.trim());
    if (result.error) {
      setError(result.error);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
    setBusy(null);
  }

  async function onGuest() {
    setError(null);
    setBusy("guest");
    const result = await signInAnonymously();
    if (result.error) setError(result.error);
    setBusy(null);
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "mindkshetra-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("exportFailed"));
    }
    setExporting(false);
  }

  async function onEmailVotd() {
    if (!votdConfigured) return;
    setVotdEmail("sending");
    setError(null);
    try {
      const res = await fetch("/api/votd/email", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          setVotdConfigured(false);
          return;
        }
        setError(data.error || t("exportFailed"));
        setVotdEmail("idle");
        return;
      }
      setVotdEmail("sent");
    } catch {
      setError(t("exportFailed"));
      setVotdEmail("idle");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-sm text-[var(--text-muted)]">
        {t("loading")}
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-md animate-fade space-y-4 py-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">
          {t("account")}
        </h1>
        <p className="text-[var(--text-muted)]">{t("authNotConfigured")}</p>
      </div>
    );
  }

  if (user && !user.is_anonymous) {
    return (
      <div className="mx-auto max-w-md animate-fade space-y-8 py-4">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--brass)]">
            {t("account")}
          </p>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">
            {t("welcomeBack")}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
          {streak > 0 ? (
            <p className="text-sm text-[var(--brass-soft)]">
              {streak} {t("homeStreakLabel")}
            </p>
          ) : null}
        </header>

        <nav className="flex flex-col gap-2">
          <Link
            href="/verse-of-the-day"
            className="border border-[var(--brass)]/35 bg-[var(--brass)]/8 px-4 py-3.5 text-sm text-[var(--brass-soft)] transition hover:border-[var(--brass)]/55"
          >
            {t("homeVotdLink")}
          </Link>
          <Link
            href="/favorites"
            className="border border-[var(--line)] px-4 py-3.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
          >
            {t("favorites")}
          </Link>
          <Link
            href="/account/reflections"
            className="border border-[var(--line)] px-4 py-3.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
          >
            {t("myReflections")}
          </Link>
          <Link
            href="/madhav"
            className="border border-[var(--line)] px-4 py-3.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
          >
            {t("navMadhav")}
          </Link>
        </nav>

        <div className="space-y-3 border-t border-[var(--hairline)] pt-6">
          {votdConfigured ? (
            <button
              type="button"
              onClick={() => void onEmailVotd()}
              disabled={votdEmail === "sending"}
              className="w-full border border-[var(--line)] px-4 py-3 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/40 disabled:opacity-50"
            >
              {votdEmail === "sending"
                ? t("emailVotdSending")
                : votdEmail === "sent"
                  ? t("emailVotdSent")
                  : t("emailVotd")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onExport()}
            disabled={exporting}
            className="w-full border border-[var(--line)] px-4 py-3 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/40 disabled:opacity-50"
          >
            {exporting ? t("exporting") : t("exportData")}
          </button>
        </div>

        {error ? (
          <p className="text-sm leading-relaxed text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
        >
          {t("signOut")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md animate-fade space-y-8 py-4">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--brass)]">
          {t("signIn")}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--text)] sm:text-4xl">
          {user?.is_anonymous ? t("upgradeAccount") : t("signInTitle")}
        </h1>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          {user?.is_anonymous ? t("upgradeAccountBlurb") : t("accountSignInBlurb")}
        </p>
      </header>

      {status === "sent" ? (
        <div className="space-y-4 border border-[var(--brass)]/35 bg-[var(--brass)]/8 px-4 py-5">
          <p className="text-sm leading-relaxed text-[var(--brass-soft)]">
            {t("magicLinkSent")}
          </p>
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            {t("magicLinkHint")}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{email}</p>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setEmail("");
            }}
            className="text-sm text-[var(--text-muted)] underline-offset-2 hover:text-[var(--brass-soft)] hover:underline"
          >
            {t("useDifferentEmail")}
          </button>
        </div>
      ) : (
        <form onSubmit={onEmailSubmit} className="space-y-3">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {t("emailLabel")}
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-3.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)]/60 focus:border-[var(--brass)]/55"
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending" || !email.trim()}
            className="w-full min-h-12 bg-[var(--brass)] px-4 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
          >
            {status === "sending" ? t("sendingLink") : t("signInEmail")}
          </button>
        </form>
      )}

      <div className="relative text-center">
        <span className="relative z-10 bg-[var(--void)] px-3 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t("orDivider")}
        </span>
        <span
          className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--line)]"
          aria-hidden
        />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void onGoogle()}
          disabled={busy !== null}
          className="w-full min-h-12 border border-[var(--line)] px-4 py-3 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/45 disabled:opacity-50"
        >
          {busy === "google" ? t("loading") : t("signInGoogle")}
        </button>

        {!user ? (
          <button
            type="button"
            onClick={() => void onGuest()}
            disabled={busy !== null}
            className="w-full min-h-11 text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50"
          >
            {busy === "guest" ? t("loading") : t("guest")}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm leading-relaxed text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-[var(--text-muted)]/80">
        {t("authPrivacyNote")}
      </p>
    </div>
  );
}
