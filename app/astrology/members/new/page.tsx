"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import BirthForm from "@/components/astrology/BirthForm";
import { useLanguage } from "@/components/LanguageProvider";

export default function NewAstrologyMemberPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="relative mx-auto max-w-3xl space-y-10 py-10 sm:py-14 animate-fade">
      <div
        className="pointer-events-none absolute -right-4 top-4 select-none font-display text-[5rem] leading-none text-white/[0.04] sm:text-[7rem]"
        aria-hidden
      >
        जन्म
      </div>

      <header className="relative space-y-3">
        <Link
          href="/astrology/members"
          className="text-xs text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
        >
          ← {t("astroMembersTitle")}
        </Link>
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brass-soft)]">
          {t("astroEyebrow")}
        </p>
        <h1 className="font-display text-3xl tracking-tight text-[var(--text)] sm:text-4xl">
          {t("astroAddMember")}
        </h1>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          {t("astroAddMemberBlurb")}
        </p>
      </header>

      <div className="relative border-t border-[var(--brass)]/25 pt-8">
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
    </div>
  );
}
