"use client";

import { useMemo, useState } from "react";
import MoodGrid from "@/components/MoodGrid";
import { useLanguage } from "@/components/LanguageProvider";
import { moods } from "@/lib/moods-data";

type OrderMode = "static" | "loading" | "chart" | "unavailable";

/**
 * Chart-aware ordering (plan Phase 3.3) is optional and fail-soft: the
 * static order renders instantly, the toggle only ever reorders what is
 * already there, and any failure quietly returns to static. Provenance
 * stays soft — "ordered alongside", never "because of".
 */
export default function MoodPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<OrderMode>("static");
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  async function enableChartOrder() {
    if (orderedIds) {
      setMode("chart");
      return;
    }
    setMode("loading");
    try {
      const membersRes = await fetch("/api/astrology/members");
      if (!membersRes.ok) throw new Error();
      const { members } = (await membersRes.json()) as {
        members: Array<{ id: string; relationship: string }>;
      };
      const member =
        members?.find((m) => m.relationship === "self") ?? members?.[0];
      if (!member) throw new Error();
      const orderRes = await fetch("/api/moods/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      if (!orderRes.ok) throw new Error();
      const data = (await orderRes.json()) as { order?: string[] };
      if (!data.order?.length) throw new Error();
      setOrderedIds(data.order);
      setMode("chart");
    } catch {
      setMode("unavailable");
    }
  }

  const displayMoods = useMemo(() => {
    if (mode !== "chart" || !orderedIds) return moods;
    const byId = new Map(moods.map((m) => [m.id, m]));
    const ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((m): m is (typeof moods)[number] => Boolean(m));
    // Defensive: any mood the order response missed keeps its static slot.
    for (const mood of moods) {
      if (!ordered.includes(mood)) ordered.push(mood);
    }
    return ordered;
  }, [mode, orderedIds]);

  const chartActive = mode === "chart";

  return (
    <div className="animate-fade">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          {t("moodEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--text)] sm:text-5xl">
          {t("moodTitle")}
        </h1>
        <p className="mt-3 text-[var(--text-muted)]">{t("moodIntro")}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            chartActive ? setMode("static") : void enableChartOrder()
          }
          disabled={mode === "loading"}
          aria-pressed={chartActive}
          className={`min-h-9 border px-3 py-1.5 text-xs transition disabled:opacity-60 ${
            chartActive
              ? "border-[var(--brass)]/45 text-[var(--brass-soft)]"
              : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
          }`}
        >
          {mode === "loading"
            ? t("moodChartOrderLoading")
            : t("moodChartOrderToggle")}
        </button>
        {chartActive ? (
          <span className="text-xs text-[var(--text-muted)]">
            {t("moodChartOrderOn")}
          </span>
        ) : null}
        {mode === "unavailable" ? (
          <span className="text-xs text-[var(--text-muted)]">
            {t("moodChartOrderUnavailable")}
          </span>
        ) : null}
      </div>

      <div className="mt-10">
        <MoodGrid moods={displayMoods} />
      </div>
    </div>
  );
}
