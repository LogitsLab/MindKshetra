"use client";

import Link from "next/link";
import ImmersiveHero from "@/components/ImmersiveHero";
import JapaPanel from "@/components/JapaPanel";
import { useLanguage } from "@/components/LanguageProvider";

export default function JapaPageClient() {
  const { t } = useLanguage();

  return (
    <div className="life-hub pb-10">
      <ImmersiveHero
        image="/images/paths/sadhana.jpg"
        eyebrow={t("japaTitle")}
        title={t("japaSetupTitle")}
        intro={t("japaIntro")}
        actions={
          <Link
            href="/sadhana"
            className="inline-flex min-h-12 items-center border border-white/25 px-5 py-3 text-sm text-white/80 transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
          >
            {t("sadhanaTitle")}
          </Link>
        }
      />
      <div className="max-w-3xl">
        <JapaPanel visible hideSetupHeading />
      </div>
    </div>
  );
}