"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { DictKey } from "@/lib/i18n/dictionary";
import type { LifeArea } from "@/lib/astrology/types";

type Card = {
  area: LifeArea;
  fact: string;
  timing: string | null;
  actionIndex: number;
  verse: { id: number; ref: string; english: string; hindi: string };
};

/**
 * Pressure → Practice (plan Phase 3.3, the moat wedge): the chart's leading
 * tension, one verse from that area's themes, one small action. Fail-soft:
 * any fetch problem and the card simply isn't there — it may only ever add
 * to the overview. Provenance copy states companionship, never causation
 * (see lib/bridge/chart-to-verse.ts calibration warning).
 */
export default function PressurePracticeCard({ memberId }: { memberId: string }) {
  const { t, lang } = useLanguage();
  const [card, setCard] = useState<Card | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    fetch("/api/astrology/practice-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.verse) setCard(data as Card);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (!card) return null;

  const actionKey = `ppAction_${card.area}_${card.actionIndex}` as DictKey;
  const excerptSource = lang === "hi" ? card.verse.hindi : card.verse.english;
  const excerpt =
    excerptSource.length > 180
      ? `${excerptSource.slice(0, 180).trimEnd()}…`
      : excerptSource;

  return (
    <section className="border border-[var(--line)] px-4 py-4">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--brass-soft)]">
        {t("ppEyebrow")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
        {card.fact}
      </p>
      {card.timing ? (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{card.timing}</p>
      ) : null}

      <div className="mt-4 border-t border-[var(--hairline)] pt-4">
        <p className="text-[15px] font-light leading-relaxed text-[var(--text-soft)]">
          {excerpt}
        </p>
        <Link
          href={`/sloka/${card.verse.id}`}
          className="mt-2 inline-block text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
        >
          <span className="font-display">{card.verse.ref}</span> ·{" "}
          {t("ppReadVerse")}
        </Link>
      </div>

      <div className="mt-4 border-t border-[var(--hairline)] pt-4">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {t("ppActionLabel")}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-soft)]">
          {t(actionKey)}
        </p>
      </div>

      <p className="mt-4 text-xs text-[var(--text-muted)]">{t("ppProvenance")}</p>
    </section>
  );
}
