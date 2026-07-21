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
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col animate-fade">
      <header className="flex shrink-0 items-center gap-3 sm:gap-4">
        <Image
          src="/brand/madhav.jpg"
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-[var(--brass)]/40 sm:h-12 sm:w-12"
          priority
        />
        <div className="min-w-0">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-[var(--brass-soft)] sm:text-xs">
            {t("madhavEyebrow")}
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold text-[var(--text)] sm:text-3xl">
            {t("madhavTitle")}
          </h1>
        </div>
      </header>

      <div className="mt-4 min-h-0 flex-1 sm:mt-5">
        <ChatWindow initialPrompt={initialPrompt} />
      </div>

      <p className="mt-3 shrink-0 text-xs leading-relaxed text-[var(--text-muted)] sm:mt-4">
        {t("madhavDisclaimer")}
      </p>
    </div>
  );
}

export default function MadhavPage() {
  return (
    <Suspense fallback={<div className="animate-fade text-[var(--text-muted)]">…</div>}>
      <MadhavContent />
    </Suspense>
  );
}
