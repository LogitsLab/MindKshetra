"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AuthButton from "@/components/AuthButton";
import { ThemeToggle } from "@/components/ThemeProvider";
import type { DictKey } from "@/lib/i18n/dictionary";
import type { AppLang } from "@/lib/i18n/dictionary";

export default function Nav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/explore", label: t("navExplore") },
    { href: "/mood", label: t("navMood") },
    { href: "/astrology", label: t("navAstrology") },
    { href: "/madhav", label: t("navMadhav") },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
    <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--nav-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
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
          <span className="truncate">MindKshetra</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2.5 text-[15px] transition ${
                    active
                      ? "text-[var(--brass-soft)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="link-underline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
          <LangToggle lang={lang} setLang={setLang} t={t} />
          <ThemeToggle />
          <AuthButton />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <AuthButton />
          <ThemeToggle />
          <LangToggle lang={lang} setLang={setLang} t={t} />
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
