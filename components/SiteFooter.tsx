"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME } from "@/components/BrandWordmark";
import { useLanguage } from "@/components/LanguageProvider";

export default function SiteFooter() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  if (pathname === "/madhav") return null;

  return (
    <footer className="border-t border-[var(--hairline)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-[var(--text-muted)]">
          © {year} {BRAND_NAME}
        </p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <Link
            href="/support"
            className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {t("navSupport")}
          </Link>
          <Link
            href="/privacy"
            className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {t("navPrivacy")}
          </Link>
          <Link
            href="/account"
            className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            {t("navAccount")}
          </Link>
          {process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL ? (
            <a
              href={process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
            >
              WhatsApp
            </a>
          ) : null}
          {process.env.NEXT_PUBLIC_TELEGRAM_URL ? (
            <a
              href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
            >
              Telegram
            </a>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
