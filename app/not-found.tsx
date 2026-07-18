"use client";

import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-lg py-16 animate-fade">
      <EmptyState title={t("notFoundTitle")} body={t("notFoundBody")} />
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-[var(--brass-soft)] transition hover:text-[var(--brass)]"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
