"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BirthForm, { type BirthFormValues } from "@/components/astrology/BirthForm";
import ChartHub from "@/components/astrology/ChartHub";
import { useLanguage } from "@/components/LanguageProvider";
import type { ChartPayload, Relationship } from "@/lib/astrology/types";

export default function AstrologyMemberHubPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [title, setTitle] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("self");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const load = useCallback(
    async (asOfDate?: string) => {
      const res = await fetch("/api/astrology/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: id,
          ...(asOfDate ? { asOfDate } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return null;
      }
      setChart(data.chart);
      setTitle(data.chart?.birth?.name || t("astroTitle"));
      return data.chart as ChartPayload;
    },
    [id, t]
  );

  useEffect(() => {
    load().catch(() => setError("Failed to load chart"));
    fetch("/api/astrology/members")
      .then((res) => res.json())
      .then((data) => {
        const m = (data.members || []).find(
          (row: { id: string }) => row.id === id
        );
        if (m?.relationship) setRelationship(m.relationship);
        if (m?.name) setTitle(m.name);
      })
      .catch(() => {
        /* optional */
      });
  }, [load, id]);

  async function saveBirth(values: BirthFormValues) {
    setEditBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/astrology/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          gender: values.gender || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditBusy(false);
    }
  }

  if (error && !chart) {
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

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8 sm:py-10 animate-fade">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
        >
          ← {t("astroOpen")}
        </button>
        <h1 className="font-display text-3xl text-[var(--text)]">
          {t("astroEditBirth")}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">{t("astroEditBirthWarn")}</p>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <BirthForm
          mode="member"
          submitLabel={editBusy ? t("astroWorking") : t("astroSaveBirth")}
          initial={{
            name: chart.birth.name || title,
            relationship,
            dob: chart.birth.dob,
            tob: chart.birth.tob || "12:00",
            tobUnknown: chart.tobUnknown,
            gender: (chart.birth.gender as BirthFormValues["gender"]) || "",
            placeLabel: chart.birth.placeLabel,
            lat: chart.birth.lat,
            lng: chart.birth.lng,
            ianaTz: chart.birth.ianaTz,
          }}
          onSubmit={saveBirth}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade py-8 sm:py-10">
      <div className="mx-auto mb-6 flex max-w-3xl lg:max-w-none">
        <Link
          href="/astrology/members"
          className="text-xs text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--brass-soft)] hover:underline"
        >
          ← {t("astroMembersTitle")}
        </Link>
      </div>
      {error ? (
        <p className="mx-auto mb-4 max-w-3xl text-sm text-red-400 lg:max-w-none">
          {error}
        </p>
      ) : null}
      <ChartHub
        chart={chart}
        title={title}
        subtitle={`${chart.birth.dob} · ${chart.birth.placeLabel}`}
        memberId={id}
        showGuidedPath
        onEditBirth={() => setEditing(true)}
        onAsOfDateChange={async (asOfDate) => {
          const next = await load(asOfDate);
          if (!next) throw new Error("Failed");
          return next;
        }}
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
