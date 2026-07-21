"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useProgress } from "@/components/ProgressProvider";

const fieldClass =
  "w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)]/55 focus:border-[var(--brass)]/55";

const labelClass =
  "text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]";

export default function AccountPageClient() {
  const {
    user,
    loading,
    configured,
    signInWithEmail,
    signInAnonymously,
    signOut,
  } = useAuth();
  const { t } = useLanguage();
  const { continueSlokaId } = useProgress();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"guest" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [votdEmail, setVotdEmail] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [votdConfigured, setVotdConfigured] = useState(false);
  const [votdEnabled, setVotdEnabled] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [streak, setStreak] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [place, setPlace] = useState("");
  const [about, setAbout] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"" | "en" | "hi">(
    ""
  );
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");

  useEffect(() => {
    if (!user || user.is_anonymous) {
      setStreak(0);
      setVotdConfigured(false);
      setVotdEnabled(true);
      setDisplayName("");
      setDateOfBirth("");
      setPlace("");
      setAbout("");
      setPreferredLanguage("");
      return;
    }
    fetch("/api/account/streak", { method: "GET" })
      .then((r) => r.json())
      .then((d) => setStreak(Number(d.current) || 0))
      .catch(() => {});
    fetch("/api/votd/email")
      .then((r) => r.json())
      .then((d) => {
        setVotdConfigured(Boolean(d.configured));
        setVotdEnabled(d.enabled !== false);
      })
      .catch(() => setVotdConfigured(false));
    fetch("/api/account/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.votdEmailEnabled === "boolean") {
          setVotdEnabled(d.votdEmailEnabled);
        }
        if (typeof d.displayName === "string") setDisplayName(d.displayName);
        if (d.dateOfBirth) setDateOfBirth(String(d.dateOfBirth).slice(0, 10));
        else setDateOfBirth("");
        if (typeof d.place === "string") setPlace(d.place);
        if (typeof d.about === "string") setAbout(d.about);
        if (d.preferredLanguage === "en" || d.preferredLanguage === "hi") {
          setPreferredLanguage(d.preferredLanguage);
        } else {
          setPreferredLanguage("");
        }
      })
      .catch(() => {});
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
    if (!votdConfigured || !votdEnabled) return;
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
        if (res.status === 403) {
          setVotdEnabled(false);
          setError(t("emailVotdDisabled"));
          setVotdEmail("idle");
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

  async function onToggleVotdEmails() {
    const next = !votdEnabled;
    setPrefsBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votdEmailEnabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("exportFailed"));
        return;
      }
      setVotdEnabled(Boolean(data.votdEmailEnabled));
      if (!next) setVotdEmail("idle");
    } catch {
      setError(t("exportFailed"));
    } finally {
      setPrefsBusy(false);
    }
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          dateOfBirth: dateOfBirth || null,
          place,
          about,
          preferredLanguage: preferredLanguage || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("exportFailed"));
        setProfileStatus("idle");
        return;
      }
      if (typeof data.displayName === "string") setDisplayName(data.displayName);
      if (data.dateOfBirth) setDateOfBirth(String(data.dateOfBirth).slice(0, 10));
      else setDateOfBirth("");
      if (typeof data.place === "string") setPlace(data.place);
      if (typeof data.about === "string") setAbout(data.about);
      if (data.preferredLanguage === "en" || data.preferredLanguage === "hi") {
        setPreferredLanguage(data.preferredLanguage);
      } else {
        setPreferredLanguage("");
      }
      try {
        window.dispatchEvent(new Event("mindkshetra:prefs"));
      } catch {
        /* ignore */
      }
      setProfileStatus("saved");
      window.setTimeout(() => setProfileStatus("idle"), 2000);
    } catch {
      setError(t("exportFailed"));
      setProfileStatus("idle");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center text-sm text-[var(--text-muted)]">
        {t("loading")}
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-lg animate-fade py-10">
        <div className="glass px-6 py-8 sm:px-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
            {t("account")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)]">
            {t("account")}
          </h1>
          <p className="mt-3 text-[var(--text-muted)]">{t("authNotConfigured")}</p>
        </div>
      </div>
    );
  }

  if (user && !user.is_anonymous) {
    const name = displayName.trim();
    const initial = (name || user.email || "?").slice(0, 1).toUpperCase();

    const paths = [
      ...(continueSlokaId
        ? [
            {
              href: `/sloka/${continueSlokaId}`,
              label: t("continueReading"),
              accent: true,
            },
          ]
        : []),
      { href: "/verse-of-the-day", label: t("homeVotdLink"), accent: !continueSlokaId },
      { href: "/favorites", label: t("favorites"), accent: false },
      { href: "/account/reflections", label: t("myReflections"), accent: false },
      { href: "/madhav", label: t("navMadhav"), accent: false },
    ];

    return (
      <div className="relative mx-auto max-w-2xl animate-fade pb-12 pt-2">
        <Image
          src="/ornaments/chapter.svg"
          alt=""
          width={160}
          height={160}
          className="pointer-events-none absolute -right-2 -top-4 opacity-[0.08] sm:right-0"
        />

        {/* Identity */}
        <header className="glass relative overflow-hidden px-6 py-8 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-start gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center border border-[var(--brass)]/40 bg-[var(--brass)]/10 font-display text-2xl text-[var(--brass-soft)]"
              aria-hidden
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
                {t("account")}
              </p>
              <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--text)] sm:text-4xl">
                {name || t("welcomeBack")}
              </h1>
              <p className="truncate text-sm text-[var(--text-muted)]">
                {user.email}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-[var(--text-muted)]">
                {place.trim() ? <span>{place.trim()}</span> : null}
                {streak > 0 ? (
                  <span className="text-[var(--brass-soft)]">
                    {streak} {t("homeStreakLabel")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* Paths */}
        <section className="mt-10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("libraryTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("libraryBlurb")}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {paths.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-3 text-sm transition ${
                  p.accent
                    ? "border border-[var(--brass)]/40 bg-[var(--brass)]/10 text-[var(--brass-soft)] hover:border-[var(--brass)]/65"
                    : "border border-[var(--line)] text-[var(--text)] hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
                }`}
              >
                <span>{p.label}</span>
                <span
                  className="text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brass-soft)]"
                  aria-hidden
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Profile */}
        <section className="mt-12 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("profileTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("profileBlurb")}
            </p>
          </div>

          <form onSubmit={onSaveProfile} className="glass space-y-5 px-5 py-6 sm:px-7 sm:py-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClass}>{t("profileName")}</span>
                <input
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("profileNamePlaceholder")}
                  className={fieldClass}
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClass}>{t("profileEmail")}</span>
                <input
                  type="email"
                  value={user.email ?? ""}
                  readOnly
                  className={`${fieldClass} cursor-default opacity-70`}
                />
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>{t("profileDob")}</span>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className={fieldClass}
                />
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>{t("profilePlace")}</span>
                <input
                  type="text"
                  autoComplete="address-level2"
                  maxLength={120}
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder={t("profilePlacePlaceholder")}
                  className={fieldClass}
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClass}>{t("profileLang")}</span>
                <select
                  value={preferredLanguage}
                  onChange={(e) =>
                    setPreferredLanguage(e.target.value as "" | "en" | "hi")
                  }
                  className={fieldClass}
                >
                  <option value="">{t("profileLangSystem")}</option>
                  <option value="en">{t("langEn")}</option>
                  <option value="hi">{t("langHi")}</option>
                </select>
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClass}>{t("profileAbout")}</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder={t("profileAboutPlaceholder")}
                  className={`${fieldClass} resize-y`}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={profileStatus === "saving"}
                className="min-h-11 bg-[var(--brass)] px-6 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
              >
                {profileStatus === "saving"
                  ? t("profileSaving")
                  : profileStatus === "saved"
                    ? t("profileSaved")
                    : t("profileSave")}
              </button>
            </div>
          </form>
        </section>

        {/* Preferences */}
        <section className="mt-12 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("preferencesTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("preferencesBlurb")}
            </p>
          </div>

          <div className="glass divide-y divide-[var(--hairline)]">
            <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-7">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-[var(--text)]">{t("votdEmailToggle")}</p>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {t("votdEmailToggleBlurb")}
                </p>
                {!votdConfigured ? (
                  <p className="text-xs leading-relaxed text-[var(--text-muted)]/80">
                    {t("votdEmailNotReady")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={votdEnabled}
                disabled={prefsBusy}
                onClick={() => void onToggleVotdEmails()}
                className={`relative h-8 w-14 shrink-0 border transition disabled:opacity-50 ${
                  votdEnabled
                    ? "border-[var(--brass)]/55 bg-[var(--brass)]/25"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 bg-[var(--brass-soft)] transition ${
                    votdEnabled ? "left-8" : "left-1 opacity-50"
                  }`}
                />
                <span className="sr-only">
                  {votdEnabled ? t("votdEmailOn") : t("votdEmailOff")}
                </span>
              </button>
            </div>

            {votdConfigured && votdEnabled ? (
              <div className="px-5 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={() => void onEmailVotd()}
                  disabled={votdEmail === "sending"}
                  className="text-sm text-[var(--brass-soft)] underline-offset-4 transition hover:underline disabled:opacity-50"
                >
                  {votdEmail === "sending"
                    ? t("emailVotdSending")
                    : votdEmail === "sent"
                      ? t("emailVotdSent")
                      : t("emailVotd")}
                </button>
              </div>
            ) : null}

            <div className="px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={() => void onExport()}
                disabled={exporting}
                className="text-sm text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline disabled:opacity-50"
              >
                {exporting ? t("exporting") : t("exportData")}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p
            className="mt-6 text-sm leading-relaxed text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-10 border-t border-[var(--hairline)] pt-6">
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md animate-fade py-6 sm:py-10">
      <div className="glass relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
        <Image
          src="/ornaments/divider.svg"
          alt=""
          width={220}
          height={16}
          className="pointer-events-none absolute -right-6 top-6 opacity-30"
        />
        <header className="relative space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
            {t("signIn")}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--text)] sm:text-4xl">
            {user?.is_anonymous ? t("upgradeAccount") : t("signInTitle")}
          </h1>
          <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
            {user?.is_anonymous
              ? t("upgradeAccountBlurb")
              : t("accountSignInBlurb")}
          </p>
          {continueSlokaId ? (
            <Link
              href={`/sloka/${continueSlokaId}`}
              className="inline-flex min-h-11 items-center bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              {t("continueReading")}
            </Link>
          ) : null}
        </header>

        <div className="relative mt-8 space-y-6">
          {status === "sent" ? (
            <div className="space-y-3 border border-[var(--brass)]/35 bg-[var(--brass)]/8 px-4 py-5">
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
                <span className={labelClass}>{t("emailLabel")}</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className={`${fieldClass} py-3.5`}
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
            <span className="relative z-10 bg-[var(--panel)] px-3 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
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
              disabled
              aria-disabled="true"
              title={t("signInGoogleSoon")}
              className="w-full min-h-12 cursor-not-allowed border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-muted)] opacity-60"
            >
              {t("signInGoogleSoon")}
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
            <p
              className="text-sm leading-relaxed text-[var(--danger)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <p className="text-xs leading-relaxed text-[var(--text-muted)]/80">
            {t("authPrivacyNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
