"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

const linkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

export function StoreBadges({ className = "" }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        {...linkProps}
        className="store-badge"
        aria-label={`${t("storeAppStoreKicker")} ${t("storeAppStore")}`}
      >
        <AppleMark />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-medium tracking-wide text-white/60">
            {t("storeAppStoreKicker")}
          </span>
          <span className="mt-1 font-display text-[15px] text-white">
            {t("storeAppStore")}
          </span>
        </span>
      </a>
      <a
        href={PLAY_STORE_URL}
        {...linkProps}
        className="store-badge"
        aria-label={`${t("storePlayKicker")} ${t("storePlay")}`}
      >
        <PlayMark />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-medium tracking-wide text-white/60">
            {t("storePlayKicker")}
          </span>
          <span className="mt-1 font-display text-[15px] text-white">
            {t("storePlay")}
          </span>
        </span>
      </a>
    </div>
  );
}

export function StoreTextLinks() {
  const { t } = useLanguage();

  return (
    <>
      <a
        href={APP_STORE_URL}
        {...linkProps}
        className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
      >
        {t("storeAppStore")}
      </a>
      <a
        href={PLAY_STORE_URL}
        {...linkProps}
        className="text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
      >
        {t("storePlay")}
      </a>
    </>
  );
}

function AppleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden className="shrink-0 text-white">
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="shrink-0 text-white">
      <path
        fill="currentColor"
        d="M8 5.1v13.8c0 .7.8 1.1 1.4.7l10.2-6.9c.5-.4.5-1.1 0-1.5L9.4 4.4c-.6-.4-1.4 0-1.4.7z"
      />
    </svg>
  );
}
