"use client";

import Link from "next/link";
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
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-red-400">{error}</p>
        <Link
          href="/astrology/members"
          className="text-sm text-[var(--brass-soft)] underline-offset-4 hover:underline"
        >
          ← {t("astroMembersTitle")}
        </Link>
      </div>
    );
  }
  if (!chart) {
    return (
      <p className="py-20 text-center text-sm text-[var(--text-muted)]">
        {t("loading")}
      </p>
    );
  }

  return (
    <div className="animate-fade py-8 sm:py-10">
      <div className="mx-auto mb-6 flex max-w-3xl">
        <Link
          href="/astrology/members"
          className="text-xs text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
        >
          ← {t("astroMembersTitle")}
        </Link>
      </div>
      <ChartHub
        chart={chart}
        title={title}
        subtitle={`${chart.birth.dob} · ${chart.birth.placeLabel}`}
        memberId={id}
        showGuidedPath
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
