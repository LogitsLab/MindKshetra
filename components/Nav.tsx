"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AuthButton from "@/components/AuthButton";
import { BrandNavWordmark } from "@/components/BrandWordmark";
import { ThemeToggle } from "@/components/ThemeProvider";
import type { DictKey } from "@/lib/i18n/dictionary";
import type { AppLang } from "@/lib/i18n/dictionary";

export default function Nav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  // Seven equal links crowded the bar and wrapped "Ask Madhav" onto two
  // lines. Four carry the daily journey; the rest live behind More; Madhav
  // is the flagship and gets its own accent. Mobile still lists everything.
  const primaryLinks = [
    { href: "/explore", label: t("navExplore") },
    { href: "/mood", label: t("navMood") },
    { href: "/sadhana", label: t("navPractice") },
    { href: "/astrology", label: t("navAstrology") },
  ];
  const moreLinks = [
    { href: "/panchang", label: t("navPanchang") },
    { href: "/community", label: t("navSangha") },
    { href: "/meditation", label: t("homeMeditationTitle") },
    { href: "/wallpapers", label: t("navWallpapers") },
    { href: "/support", label: t("navSupport") },
  ];
  const madhavLink = { href: "/madhav", label: t("navMadhav") };
  const links = [...primaryLinks, ...moreLinks, madhavLink];

  const moreActive = moreLinks.some((l) => pathname.startsWith(l.href));

  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // Close More on outside click or Escape — a dropdown that traps focus or
  // lingers after navigation is worse than no dropdown.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={
        pathname === "/"
          ? "sticky top-0 z-40 border-b border-transparent bg-gradient-to-b from-[rgba(7,9,15,.72)] via-[rgba(7,9,15,.35)] to-transparent backdrop-blur-md"
          : "sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--nav-bg)]/90 backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2 font-display text-lg font-semibold tracking-tight text-[var(--text)] transition hover:text-[var(--brass-soft)] sm:gap-2.5 sm:text-2xl"
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src="/brand/mark.svg"
            alt=""
            width={28}
            height={28}
            className="shrink-0 opacity-90 transition group-hover:opacity-100"
            priority
          />
          <BrandNavWordmark />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2.5 md:flex">
          <nav className="flex items-center gap-0.5">
            {primaryLinks.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-[13px] font-medium tracking-wide transition ${
                    active
                      ? "text-[var(--brass-soft)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                className={`px-3 py-2 text-[13px] font-medium tracking-wide transition ${
                  moreActive || moreOpen
                    ? "text-[var(--brass-soft)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t("navMore")}
              </button>
              {moreOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] border border-[var(--line)] bg-[var(--nav-bg)] py-1 backdrop-blur-xl">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-4 py-2.5 text-sm transition ${
                        pathname.startsWith(link.href)
                          ? "text-[var(--brass-soft)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          <Link
            href={madhavLink.href}
            className={`min-h-9 px-3.5 py-2 text-[13px] font-medium transition ${
              pathname.startsWith(madhavLink.href)
                ? "bg-[var(--brass-soft)] text-[var(--on-brass)]"
                : "bg-[var(--brass)] text-[var(--on-brass)] hover:bg-[var(--brass-soft)]"
            }`}
          >
            {madhavLink.label}
          </Link>
          <LangToggle lang={lang} setLang={setLang} t={t} />
          <ThemeToggle />
          <AuthButton />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <AuthButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center border border-[var(--line)] text-[var(--text)] transition hover:border-[var(--brass)]/45"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t("menuClose") : t("menuOpen")}
          >
            <span className="sr-only">
              {menuOpen ? t("menuClose") : t("menuOpen")}
            </span>
            <span className="flex w-5 flex-col gap-1.5" aria-hidden>
              <span
                className={`h-px w-full bg-current transition ${
                  menuOpen ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-px w-full bg-current transition ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-px w-full bg-current transition ${
                  menuOpen ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {menuOpen ? (
        <div
          id="mobile-nav"
          className="border-t border-[var(--hairline)] bg-[var(--nav-bg)] backdrop-blur-xl md:hidden"
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] py-3">
              <span className="eyebrow text-[var(--text-muted)]">
                {lang === "hi" ? "भाषा" : "Language"}
              </span>
              <LangToggle lang={lang} setLang={setLang} t={t} />
            </div>
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`border-b border-[var(--hairline)] py-3.5 text-base transition last:border-0 ${
                    active
                      ? "text-[var(--brass-soft)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/account"
              className={`border-b border-[var(--hairline)] py-3.5 text-base transition ${
                pathname.startsWith("/account")
                  ? "text-[var(--brass-soft)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {t("account")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function LangToggle({
  lang,
  setLang,
  t,
}: {
  lang: AppLang;
  setLang: (l: AppLang) => void;
  t: (key: DictKey) => string;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-0.5 border border-[var(--line)] p-0.5"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`min-h-10 min-w-10 px-2.5 text-xs font-medium tracking-wide transition ${
          lang === "en"
            ? "bg-[var(--brass)] text-[var(--on-brass)]"
            : "text-[var(--text-muted)] hover:text-[var(--text)]"
        }`}
        aria-pressed={lang === "en"}
      >
        {t("langEn")}
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        className={`min-h-10 min-w-10 px-2.5 text-xs font-medium tracking-wide transition ${
          lang === "hi"
            ? "bg-[var(--brass)] text-[var(--on-brass)]"
            : "text-[var(--text-muted)] hover:text-[var(--text)]"
        }`}
        aria-pressed={lang === "hi"}
      >
        {t("langHi")}
      </button>
    </div>
  );
}
