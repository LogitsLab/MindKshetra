"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ImmersiveHero from "@/components/ImmersiveHero";
import { useLanguage } from "@/components/LanguageProvider";
import { PracticeMarks } from "@/components/MilestoneMarks";
import { useProgress } from "@/components/ProgressProvider";

const RETURN_TO_KEY = "mindkshetra-return-to";

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
    signInWithGoogle,
    signInAnonymously,
    signOut,
  } = useAuth();
  const { t } = useLanguage();
  const { continueSlokaId } = useProgress();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"guest" | "google" | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [votdEmail, setVotdEmail] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [votdConfigured, setVotdConfigured] = useState(false);
  const [votdTestingMode, setVotdTestingMode] = useState(false);
  const [votdEnabled, setVotdEnabled] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [notifDailyVerse, setNotifDailyVerse] = useState(false);
  const [notifDailyVerseHour, setNotifDailyVerseHour] = useState(8);
  const [notifStreakReminder, setNotifStreakReminder] = useState(false);
  const [notifCommunity, setNotifCommunity] = useState(true);
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
  const [publicHandle, setPublicHandle] = useState("");
  const [publicDisplayName, setPublicDisplayName] = useState("");
  const [publicBio, setPublicBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [publicStatus, setPublicStatus] = useState<
    "idle" | "saving" | "saved" | "clearing"
  >("idle");
  const [deleteStage, setDeleteStage] = useState<
    "idle" | "confirming" | "deleting"
  >("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function onDeleteAccount() {
    setDeleteStage("deleting");
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("deleteAccountFailed"));
      }
      await signOut();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : t("deleteAccountFailed")
      );
      setDeleteStage("idle");
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    const intent = params.get("intent");
    if (!authError && !intent) return;
    if (authError === "otp_expired") setError(t("authLinkExpired"));
    else if (authError) setError(t("authLinkFailed"));
    if (authError) setEmailOpen(true);
    if (intent === "save-chart") setNotice(t("astroSaveGuestReturn"));
    params.delete("auth_error");
    params.delete("intent");
    const clean = `${window.location.pathname}${
      params.toString() ? `?${params}` : ""
    }`;
    window.history.replaceState({}, "", clean);
  }, [t]);

  // A flow that sent the user here to sign in (e.g. saving an incognito
  // chart) leaves an internal path in sessionStorage; bounce back once the
  // sign-in completes.
  useEffect(() => {
    if (!user || user.is_anonymous) return;
    try {
      const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
      if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        sessionStorage.removeItem(RETURN_TO_KEY);
        router.replace(returnTo);
      }
    } catch {
      // sessionStorage unavailable — stay on the account page.
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || user.is_anonymous) {
      setStreak(0);
      setVotdConfigured(false);
      setVotdEnabled(true);
      setNotifDailyVerse(false);
      setNotifDailyVerseHour(8);
      setNotifStreakReminder(false);
      setNotifCommunity(true);
      setDisplayName("");
      setDateOfBirth("");
      setPlace("");
      setAbout("");
      setPreferredLanguage("");
      setPublicHandle("");
      setPublicDisplayName("");
      setPublicBio("");
      setIsPublic(true);
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
        setVotdTestingMode(Boolean(d.testingMode));
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
        if (typeof d.notifDailyVerse === "boolean") {
          setNotifDailyVerse(d.notifDailyVerse);
        }
        if (typeof d.notifDailyVerseHour === "number") {
          setNotifDailyVerseHour(d.notifDailyVerseHour);
        } else {
          setNotifDailyVerseHour(8);
        }
        if (typeof d.notifStreakReminder === "boolean") {
          setNotifStreakReminder(d.notifStreakReminder);
        }
        if (typeof d.notifCommunity === "boolean") {
          setNotifCommunity(d.notifCommunity);
        }
      })
      .catch(() => {});
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        const p = d.profile;
        if (!p) {
          setPublicHandle("");
          setPublicDisplayName("");
          setPublicBio("");
          setIsPublic(true);
          return;
        }
        setPublicHandle(typeof p.handle === "string" ? p.handle : "");
        setPublicDisplayName(
          typeof p.display_name === "string" ? p.display_name : ""
        );
        setPublicBio(typeof p.bio === "string" ? p.bio : "");
        setIsPublic(p.is_public !== false);
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

  async function onGoogle() {
    setError(null);
    setBusy("google");
    const result = await signInWithGoogle();
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

  async function patchPrefs(body: Record<string, unknown>) {
    setPrefsBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("exportFailed"));
        return null;
      }
      if (typeof data.votdEmailEnabled === "boolean") {
        setVotdEnabled(data.votdEmailEnabled);
      }
      if (typeof data.notifDailyVerse === "boolean") {
        setNotifDailyVerse(data.notifDailyVerse);
      }
      if (typeof data.notifDailyVerseHour === "number") {
        setNotifDailyVerseHour(data.notifDailyVerseHour);
      }
      if (typeof data.notifStreakReminder === "boolean") {
        setNotifStreakReminder(data.notifStreakReminder);
      }
      if (typeof data.notifCommunity === "boolean") {
        setNotifCommunity(data.notifCommunity);
      }
      return data;
    } catch {
      setError(t("exportFailed"));
      return null;
    } finally {
      setPrefsBusy(false);
    }
  }

  async function onToggleVotdEmails() {
    const next = !votdEnabled;
    const data = await patchPrefs({ votdEmailEnabled: next });
    if (data && !next) setVotdEmail("idle");
  }

  async function onToggleNotifDailyVerse() {
    await patchPrefs({ notifDailyVerse: !notifDailyVerse });
  }

  async function onToggleNotifStreakReminder() {
    await patchPrefs({ notifStreakReminder: !notifStreakReminder });
  }

  async function onToggleNotifCommunity() {
    await patchPrefs({ notifCommunity: !notifCommunity });
  }

  async function onChangeNotifHour(hour: number) {
    if (!Number.isInteger(hour) || hour < 4 || hour > 22) return;
    setNotifDailyVerseHour(hour);
    await patchPrefs({ notifDailyVerseHour: hour });
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

  async function onSavePublicProfile(e: FormEvent) {
    e.preventDefault();
    setPublicStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: publicHandle.trim().toLowerCase(),
          displayName: publicDisplayName,
          bio: publicBio,
          isPublic,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) setError(t("publicHandleTaken"));
        else if (res.status === 400) setError(t("publicHandleInvalid"));
        else setError(data.error || t("exportFailed"));
        setPublicStatus("idle");
        return;
      }
      const p = data.profile;
      if (p) {
        setPublicHandle(typeof p.handle === "string" ? p.handle : publicHandle);
        setPublicDisplayName(
          typeof p.display_name === "string"
            ? p.display_name
            : publicDisplayName
        );
        setPublicBio(typeof p.bio === "string" ? p.bio : publicBio);
        setIsPublic(p.is_public !== false);
      }
      setPublicStatus("saved");
      window.setTimeout(() => setPublicStatus("idle"), 2000);
    } catch {
      setError(t("exportFailed"));
      setPublicStatus("idle");
    }
  }

  async function onClearPublicProfile() {
    if (!window.confirm(t("publicClearConfirm"))) return;
    setPublicStatus("clearing");
    setError(null);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("exportFailed"));
        setPublicStatus("idle");
        return;
      }
      setPublicHandle("");
      setPublicDisplayName("");
      setPublicBio("");
      setIsPublic(true);
      setPublicStatus("idle");
    } catch {
      setError(t("exportFailed"));
      setPublicStatus("idle");
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
      { href: "/account/personalize", label: "Personalize", accent: true },
      { href: "/account/achievements", label: "Achievements", accent: false },
      { href: "/account/progress", label: "Progress", accent: false },
      { href: "/journal", label: "Journal", accent: false },
      { href: "/madhav", label: t("navMadhav"), accent: false },
    ];

    return (
      <div className="life-hub relative animate-fade pb-12">
        <ImmersiveHero
          compact
          image="/images/paths/astrology.jpg"
          eyebrow={t("account")}
          title={name || t("welcomeBack")}
          intro={user.email ?? undefined}
          meta={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
              <span
                className="inline-flex h-10 w-10 items-center justify-center border border-white/25 font-display text-lg text-[var(--brass-soft)]"
                aria-hidden
              >
                {initial}
              </span>
              {place.trim() ? <span>{place.trim()}</span> : null}
              {streak > 0 ? (
                <span className="text-[var(--brass-soft)]">
                  {streak} {t("homeStreakLabel")}
                </span>
              ) : null}
            </div>
          }
          actions={
            <Link
              href="/account/personalize"
              className="inline-flex min-h-12 items-center bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
            >
              Personalize
            </Link>
          }
        />

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

        {/* Practice marks — private milestones (WS4) */}
        <PracticeMarks />

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

        {/* Public profile */}
        <section className="mt-12 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
              {t("publicProfileTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("publicProfileBlurb")}
            </p>
          </div>

          <form
            onSubmit={onSavePublicProfile}
            className="glass space-y-5 px-5 py-6 sm:px-7 sm:py-7"
          >
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              {t("publicProfileExplainer")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClass}>{t("publicHandle")}</span>
                <input
                  type="text"
                  autoComplete="username"
                  maxLength={24}
                  value={publicHandle}
                  onChange={(e) =>
                    setPublicHandle(e.target.value.toLowerCase())
                  }
                  placeholder={t("publicHandlePlaceholder")}
                  className={fieldClass}
                  required
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClass}>{t("publicDisplayName")}</span>
                <input
                  type="text"
                  maxLength={40}
                  value={publicDisplayName}
                  onChange={(e) => setPublicDisplayName(e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClass}>{t("publicBio")}</span>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={publicBio}
                  onChange={(e) => setPublicBio(e.target.value)}
                  placeholder={t("publicBioPlaceholder")}
                  className={`${fieldClass} resize-y`}
                />
              </label>
            </div>

            <div className="flex items-start justify-between gap-4 border-t border-[var(--hairline)] pt-5">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-[var(--text)]">{t("publicIsPublic")}</p>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {t("publicIsPublicBlurb")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic((v) => !v)}
                className={`relative h-8 w-14 shrink-0 border transition ${
                  isPublic
                    ? "border-[var(--brass)]/55 bg-[var(--brass)]/25"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 bg-[var(--brass-soft)] transition ${
                    isPublic ? "left-8" : "left-1 opacity-50"
                  }`}
                />
                <span className="sr-only">
                  {isPublic ? t("notifOn") : t("notifOff")}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={
                  publicStatus === "saving" || publicStatus === "clearing"
                }
                className="min-h-11 bg-[var(--brass)] px-6 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
              >
                {publicStatus === "saving"
                  ? t("publicSaving")
                  : publicStatus === "saved"
                    ? t("publicSaved")
                    : t("publicSave")}
              </button>
              {publicHandle.trim() ? (
                <Link
                  href={`/u/${publicHandle.trim()}`}
                  className="text-sm text-[var(--brass-soft)] underline-offset-4 transition hover:underline"
                >
                  {t("publicPreview")}
                </Link>
              ) : null}
              <button
                type="button"
                disabled={
                  publicStatus === "saving" || publicStatus === "clearing"
                }
                onClick={() => void onClearPublicProfile()}
                className="text-sm text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--danger)] hover:underline disabled:opacity-50"
              >
                {t("publicClear")}
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
                ) : votdTestingMode ? (
                  <p className="text-xs leading-relaxed text-[var(--text-muted)]/80">
                    {t("votdEmailTestingMode")}
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

            <div className="space-y-1 px-5 py-5 sm:px-7">
              <p className="text-sm text-[var(--text)]">{t("notifTitle")}</p>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                {t("notifBlurb")}
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-7">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-[var(--text)]">{t("notifDailyVerse")}</p>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {t("notifDailyVerseBlurb")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifDailyVerse}
                disabled={prefsBusy}
                onClick={() => void onToggleNotifDailyVerse()}
                className={`relative h-8 w-14 shrink-0 border transition disabled:opacity-50 ${
                  notifDailyVerse
                    ? "border-[var(--brass)]/55 bg-[var(--brass)]/25"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 bg-[var(--brass-soft)] transition ${
                    notifDailyVerse ? "left-8" : "left-1 opacity-50"
                  }`}
                />
                <span className="sr-only">
                  {notifDailyVerse ? t("notifOn") : t("notifOff")}
                </span>
              </button>
            </div>

            {notifDailyVerse ? (
              <div className="px-5 py-4 sm:px-7">
                <label className="block max-w-[12rem] space-y-2">
                  <span className={labelClass}>{t("notifDailyVerseHour")}</span>
                  <select
                    value={notifDailyVerseHour}
                    disabled={prefsBusy}
                    onChange={(e) =>
                      void onChangeNotifHour(Number(e.target.value))
                    }
                    className={fieldClass}
                  >
                    {Array.from({ length: 19 }, (_, i) => i + 4).map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs text-[var(--text-muted)]">
                    {t("notifDailyVerseHourBlurb")}
                  </span>
                </label>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-7">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-[var(--text)]">
                  {t("notifStreakReminder")}
                </p>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {t("notifStreakReminderBlurb")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifStreakReminder}
                disabled={prefsBusy}
                onClick={() => void onToggleNotifStreakReminder()}
                className={`relative h-8 w-14 shrink-0 border transition disabled:opacity-50 ${
                  notifStreakReminder
                    ? "border-[var(--brass)]/55 bg-[var(--brass)]/25"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 bg-[var(--brass-soft)] transition ${
                    notifStreakReminder ? "left-8" : "left-1 opacity-50"
                  }`}
                />
                <span className="sr-only">
                  {notifStreakReminder ? t("notifOn") : t("notifOff")}
                </span>
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-7">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-[var(--text)]">{t("notifCommunity")}</p>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {t("notifCommunityBlurb")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifCommunity}
                disabled={prefsBusy}
                onClick={() => void onToggleNotifCommunity()}
                className={`relative h-8 w-14 shrink-0 border transition disabled:opacity-50 ${
                  notifCommunity
                    ? "border-[var(--brass)]/55 bg-[var(--brass)]/25"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 bg-[var(--brass-soft)] transition ${
                    notifCommunity ? "left-8" : "left-1 opacity-50"
                  }`}
                />
                <span className="sr-only">
                  {notifCommunity ? t("notifOn") : t("notifOff")}
                </span>
              </button>
            </div>

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

        <div className="mt-10 space-y-4 border-t border-[var(--hairline)] pt-6">
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {t("signOut")}
          </button>

          {deleteStage === "idle" ? (
            <p>
              <button
                type="button"
                onClick={() => setDeleteStage("confirming")}
                className="text-xs text-[var(--text-muted)] transition hover:text-[var(--danger)]"
              >
                {t("deleteAccount")}
              </button>
            </p>
          ) : (
            <div className="space-y-3 border border-[var(--danger)]/35 px-4 py-4">
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {t("deleteAccountBlurb")}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={deleteStage === "deleting"}
                  onClick={() => void onDeleteAccount()}
                  className="border border-[var(--danger)]/60 px-3 py-2 text-sm text-[var(--danger)] transition hover:bg-[var(--danger)]/10 disabled:opacity-50"
                >
                  {deleteStage === "deleting"
                    ? t("deleteAccountBusy")
                    : t("deleteAccountConfirm")}
                </button>
                <button
                  type="button"
                  disabled={deleteStage === "deleting"}
                  onClick={() => {
                    setDeleteStage("idle");
                    setDeleteError(null);
                  }}
                  className="px-3 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50"
                >
                  {t("deleteAccountCancel")}
                </button>
              </div>
              {deleteError ? (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {deleteError}
                </p>
              ) : null}
            </div>
          )}

          <p>
            <Link
              href="/privacy"
              className="text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
            >
              {t("privacyPolicy")}
            </Link>
          </p>
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

        <div className="relative mt-8 space-y-5">
          {notice ? (
            <p
              className="border border-[var(--brass)]/30 bg-[var(--brass)]/8 px-4 py-3 text-sm leading-relaxed text-[var(--brass-soft)]"
              role="status"
            >
              {notice}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void onGoogle()}
            disabled={busy !== null}
            className="flex w-full min-h-12 items-center justify-center gap-3 bg-[var(--brass)] px-4 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 48 48"
              aria-hidden
              className="shrink-0"
            >
              <path
                fill="currentColor"
                d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.7-.5-4z"
              />
            </svg>
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

          <div className="relative text-center pt-1">
            <span className="relative z-10 bg-[var(--panel)] px-3 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("orDivider")}
            </span>
            <span
              className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--line)]"
              aria-hidden
            />
          </div>

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
                  setEmailOpen(true);
                }}
                className="text-sm text-[var(--text-muted)] underline-offset-2 hover:text-[var(--brass-soft)] hover:underline"
              >
                {t("useDifferentEmail")}
              </button>
            </div>
          ) : emailOpen ? (
            <form onSubmit={onEmailSubmit} className="space-y-3">
              <label className="block space-y-2">
                <span className={labelClass}>{t("emailLabel")}</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className={`${fieldClass} py-3.5`}
                />
              </label>
              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="w-full min-h-12 border border-[var(--line)] px-4 py-3 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] disabled:opacity-50"
              >
                {status === "sending" ? t("sendingLink") : t("signInEmail")}
              </button>
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="w-full text-center text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
              >
                {t("hideEmailSignIn")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="w-full min-h-11 border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/40 hover:text-[var(--brass-soft)]"
            >
              {t("useEmailInstead")}
            </button>
          )}

          {error ? (
            <p
              className="text-sm leading-relaxed text-[var(--danger)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <p className="text-xs leading-relaxed text-[var(--text-muted)]/80">
            {t("authPrivacyNote")}{" "}
            <Link
              href="/privacy"
              className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              {t("privacyPolicy")}
            </Link>
          </p>
        </div>
      </div>

      {/* Guests keep device-local practice marks too (WS4) — the panel
          computes them from this device and invites sign-in to keep them. */}
      <PracticeMarks />
    </div>
  );
}
