"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

/** Incognito casting now lives on /astrology — keep this route as a redirect. */
export default function AstrologyIncognitoRedirect() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.replace("/astrology");
  }, [router]);

  return (
    <p className="py-20 text-center text-sm text-[var(--text-muted)]">
      {t("loading")}
    </p>
  );
}
