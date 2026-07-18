"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function Nav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();

  const links = [
    { href: "/explore", label: t("navExplore") },
    { href: "/mood", label: t("navMood") },
    { href: "/madhav", label: t("navMadhav") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[rgba(7,9,15,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-[var(--text)] transition hover:text-[var(--brass-soft)] sm:text-2xl"
        >
          <Image
            src="/brand/mark.svg"
            alt=""
            width={28}
            height={28}
            className="opacity-90 transition group-hover:opacity-100"
            priority
          />
          <span>MindKshetra</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2 py-1.5 text-sm transition sm:px-3 sm:text-[15px] ${
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

          <div
            className="flex shrink-0 items-center gap-0.5 border border-[var(--line)] p-0.5"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`min-w-[2.25rem] px-2 py-1 text-xs font-medium tracking-wide transition ${
                lang === "en"
                  ? "bg-[var(--brass)] text-[var(--void)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              aria-pressed={lang === "en"}
            >
              {t("langEn")}
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`min-w-[2.25rem] px-2 py-1 text-xs font-medium tracking-wide transition ${
                lang === "hi"
                  ? "bg-[var(--brass)] text-[var(--void)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              aria-pressed={lang === "hi"}
            >
              {t("langHi")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
