"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ChatWindow from "@/components/ChatWindow";
import { useLanguage } from "@/components/LanguageProvider";

function MadhavContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt")?.trim() || undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col animate-fade">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[rgba(14,20,32,.55)] px-4 py-3 backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4">
        <Image
          src="/brand/madhav.jpg"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-[var(--brass)]/50"
          priority
        />
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-[var(--brass-soft)]">
            {t("madhavEyebrow")}
          </p>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-[var(--brass-soft)] sm:text-2xl">
            {t("madhavTitle")}
          </h1>
        </div>
        <p className="hidden max-w-xs text-right text-[11px] leading-snug text-[var(--text-muted)] lg:block">
          {t("madhavDisclaimer")}
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <ChatWindow initialPrompt={initialPrompt} fullScreen />
      </div>

      <p className="shrink-0 border-t border-[var(--hairline)] px-4 py-2 text-[11px] leading-relaxed text-[var(--text-muted)] lg:hidden">
        {t("madhavDisclaimer")}
      </p>
    </div>
  );
}

export default function MadhavPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
          …
        </div>
      }
    >
      <MadhavContent />
    </Suspense>
  );
}
