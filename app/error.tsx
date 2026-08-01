"use client";

import Link from "next/link";
import { useEffect } from "react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * The route error boundary. There was none, anywhere — so any unhandled throw
 * below the root layout dropped the reader onto Next's raw error screen: a
 * stack trace in dev, an unstyled white page in production.
 *
 * This one sits INSIDE the root layout, so nav, footer, theme and language are
 * all still mounted. That matters more than the copy: the reader keeps a way
 * out of the page that broke.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    // The digest is the only handle on a production stack trace, and it is
    // never shown to the reader — a hash is not information they can use.
    console.error("[route-error]", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 animate-fade">
      <EmptyState title={t("errorTitle")} body={t("errorBody")} />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
        >
          {t("errorRetry")}
        </button>
        <Link
          href="/"
          className="min-h-11 border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
