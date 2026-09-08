"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type Payload = {
  date: string;
  disclaimer: string;
  muhurats: Array<{
    nameEn: string;
    nameHi: string;
    startIso: string;
    endIso: string;
    tag: string;
  }>;
  choghadiya: Array<{
    kind: string;
    startIso: string;
    endIso: string;
    quality: string;
  }>;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MuhuratPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setError(false);
    setLoading(true);
    setData(null);
    void fetch("/api/astrology/muhurat")
      .then(async (r) => {
        if (!r.ok) throw new Error("unavailable");
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function qualityLabel(quality: string): string {
    if (quality === "good") return t("astroChoghQualityGood");
    if (quality === "neutral") return t("astroChoghQualityNeutral");
    if (quality === "avoid") return t("astroChoghQualityAvoid");
    return quality;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/astrology" className="text-sm text-[var(--text-muted)]">
        ← {t("astroTitle")}
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        {t("astroMuhuratTitle")}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        {t("astroMuhuratIntro")} {t("astroMuhuratApprox")}
      </p>
      {error ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            {t("astroMuhuratUnavailable")}
          </p>
          <p className="text-sm text-[var(--text-soft)]">
            {t("astroMuhuratUnavailableBody")}
          </p>
          <button
            type="button"
            onClick={load}
            className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)]"
          >
            {t("errorRetry")}
          </button>
        </div>
      ) : loading || !data ? (
        <p className="mt-6 text-[var(--text-muted)]">{t("loading")}</p>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-sm text-[var(--text-soft)]">
            {t("astroMuhuratDate")} · {data.date}
          </p>
          {data.muhurats.map((m) => (
            <div
              key={m.nameEn}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[var(--text)]">
                  {lang === "hi" ? m.nameHi : m.nameEn}
                </p>
                <span className="text-xs text-[var(--brass-soft)]">{m.tag}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                {fmt(m.startIso)} – {fmt(m.endIso)}
              </p>
            </div>
          ))}
          <div>
            <p className="eyebrow text-[var(--brass)]">{t("astroChoghadiya")}</p>
            <ul className="mt-3 space-y-2">
              {data.choghadiya.map((c) => (
                <li
                  key={c.startIso}
                  className="flex justify-between rounded border border-[var(--hairline)] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--text)]">
                    {c.kind}{" "}
                    <span className="text-[var(--text-muted)]">
                      ({qualityLabel(c.quality)})
                    </span>
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {fmt(c.startIso)}–{fmt(c.endIso)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
