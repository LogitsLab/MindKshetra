"use client";

import { useRouter } from "next/navigation";
import BirthForm from "@/components/astrology/BirthForm";
import { useLanguage } from "@/components/LanguageProvider";

export default function NewAstrologyMemberPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8 sm:py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brass-soft)]">
          {t("astroEyebrow")}
        </p>
        <h1 className="font-display text-3xl text-[var(--text)]">
          {t("astroAddMember")}
        </h1>
      </header>
      <BirthForm
        mode="member"
        submitLabel={t("astroSaveChart")}
        onSubmit={async (values) => {
          const res = await fetch("/api/astrology/members", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...values,
              gender: values.gender || null,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Save failed");
          router.push(`/astrology/members/${data.member.id}`);
        }}
      />
    </div>
  );
}
