"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ChartHub from "@/components/astrology/ChartHub";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChartPayload } from "@/lib/astrology/types";

export default function AstrologyMemberHubPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/astrology/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setChart(data.chart);
    setTitle(data.chart?.birth?.name || t("astroTitle"));
  }, [id, t]);

  useEffect(() => {
    load().catch(() => setError("Failed to load chart"));
  }, [load]);

  if (error) {
    return <p className="py-12 text-center text-red-400">{error}</p>;
  }
  if (!chart) {
    return (
      <p className="py-12 text-center text-[var(--text-muted)]">{t("loading")}</p>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      <ChartHub
        chart={chart}
        title={title}
        subtitle={`${chart.birth.dob} · ${chart.birth.placeLabel}`}
        memberId={id}
        onRequestPredictions={async (force) => {
          const res = await fetch("/api/astrology/predictions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: id, language: lang, force }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed");
          setChart(data.chart);
          return data.chart;
        }}
      />
    </div>
  );
}
