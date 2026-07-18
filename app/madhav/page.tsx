"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ChatWindow from "@/components/ChatWindow";
import { useLanguage } from "@/components/LanguageProvider";

function MadhavContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt")?.trim() || undefined;

  return (
    <div className="animate-fade">
      <header className="max-w-2xl">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-[var(--brass-soft)] sm:text-xs">
          {t("madhavEyebrow")}
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--text)] sm:mt-3 sm:text-5xl">
          {t("madhavTitle")}
        </h1>
        <p className="mt-2 hidden text-[var(--text-muted)] sm:mt-3 sm:block">
          {t("madhavIntro")}
        </p>
      </header>
      <div className="mt-4 sm:mt-8">
        <ChatWindow initialPrompt={initialPrompt} />
      </div>
      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
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
