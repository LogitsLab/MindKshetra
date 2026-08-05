"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import {
  INCOGNITO_SESSION_KEY,
  parseStoredBirth,
} from "@/components/astrology/usePredictions";
import { PLANET_LABELS, SIGN_LABELS } from "@/lib/astrology/signs";
import type {
  AstrologyMember,
  ChartPayload,
  PlanetId,
  SignId,
} from "@/lib/astrology/types";

type ChartSource =
  | { kind: "member"; id: string; name: string }
  | { kind: "incognito"; sessionId: string; birth?: ChartPayload["birth"] };

function readIncognito(): ChartSource | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INCOGNITO_SESSION_KEY);
    if (!raw) return null;
    if (!raw.startsWith("{")) {
      return { kind: "incognito", sessionId: raw };
    }
    const parsed = JSON.parse(raw) as {
      sessionId?: string;
      birth?: ChartPayload["birth"];
    };
    if (!parsed.sessionId) return null;
    return {
      kind: "incognito",
      sessionId: parsed.sessionId,
      birth: parsed.birth ?? parseStoredBirth(raw) ?? undefined,
    };
  } catch {
    return null;
  }
}

export default function TransitsClient() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  const signedIn = Boolean(user && !user.is_anonymous);

  const [members, setMembers] = useState<AstrologyMember[]>([]);
  const [source, setSource] = useState<ChartSource | null>(null);
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const labelPlanet = (id: string) =>
    PLANET_LABELS[id as PlanetId]?.[L] ?? id;
  const labelSign = (s: string | null | undefined) =>
    s ? SIGN_LABELS[s as SignId]?.[L] ?? s : "—";

  useEffect(() => {
    let alive = true;
    (async () => {
      const incog = readIncognito();
      let list: AstrologyMember[] = [];
      if (signedIn) {
        try {
          const res = await fetch("/api/astrology/members");
          if (res.ok) {
            const data = await res.json();
            list = (data.members as AstrologyMember[]) ?? [];
          }
        } catch {
          /* guest */
        }
      }
      if (!alive) return;
      setMembers(list);
      const first: ChartSource | null =
        list[0]
          ? { kind: "member", id: list[0].id, name: list[0].name }
          : incog;
      setSource(first);
      if (!first) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const loadChart = useCallback(
    async (src: ChartSource) => {
      setLoading(true);
      setError(null);
      setChart(null);
      try {
        let res: Response;
        if (src.kind === "member") {
          res = await fetch(`/api/astrology/members/${src.id}/chart`);
          if (!res.ok) {
            res = await fetch("/api/astrology/compute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ memberId: src.id }),
            });
          }
        } else {
          res = await fetch("/api/astrology/compute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chartSessionId: src.sessionId,
              ...(src.birth ? { birth: src.birth } : {}),
            }),
          });
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : L === "hi"
                ? "चार्ट लोड नहीं हो सका"
                : "Could not load chart"
          );
        }
        const data = await res.json();
        setChart(data.chart as ChartPayload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    },
    [L]
  );

  useEffect(() => {
    if (!source) return;
    void loadChart(source);
  }, [source, loadChart]);

  const transits = chart?.transits ?? null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/astrology" className="text-sm text-[var(--text-muted)]">
        ← {L === "hi" ? "ज्योतिष" : "Astrology"}
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
        {L === "hi" ? "गोचर" : "Planetary transits"}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        {L === "hi"
          ? "गोचर हिट जन्म कुंडली के विरुद्ध गणना होते हैं — एफेमेरिस सत्य का स्रोत है।"
          : "Transit hits are computed against a natal chart. Ephemeris is the source of truth."}
      </p>

      {!source && !loading ? (
        <div className="mt-8 space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            {L === "hi"
              ? "गोचर पढ़ने के लिए चार्ट खोलें।"
              : "Open a chart to read current transit context."}
          </p>
          <Link
            href="/astrology/incognito"
            className="block rounded-md border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-3 text-sm text-[var(--brass-soft)]"
          >
            {L === "hi" ? "गुप्त कुंडली बनाएँ" : "Cast incognito chart"}
          </Link>
          <Link
            href="/astrology/members"
            className="block rounded-md border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-soft)]"
          >
            {L === "hi" ? "सहेजे सदस्य" : "Saved members"}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  setSource({ kind: "member", id: m.id, name: m.name })
                }
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  source?.kind === "member" && source.id === m.id
                    ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/40"
                }`}
              >
                {m.name}
              </button>
            ))}
            {readIncognito() ? (
              <button
                type="button"
                onClick={() => {
                  const inc = readIncognito();
                  if (inc) setSource(inc);
                }}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  source?.kind === "incognito"
                    ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--brass)]/40"
                }`}
              >
                {L === "hi" ? "गुप्त चार्ट" : "Incognito"}
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="mt-8 text-sm text-[var(--text-muted)]">
              {L === "hi" ? "गोचर लोड हो रहा है…" : "Loading transits…"}
            </p>
          ) : error ? (
            <p className="mt-8 text-sm text-[var(--text-muted)]">{error}</p>
          ) : !transits ? (
            <p className="mt-8 text-sm text-[var(--text-muted)]">
              {L === "hi"
                ? "इस चार्ट के लिए गोचर उपलब्ध नहीं।"
                : "No transit snapshot for this chart."}
            </p>
          ) : (
            <div className="mt-8 space-y-6">
              <p className="text-xs text-[var(--text-muted)]">
                {L === "hi" ? "तिथि" : "As of"} {transits.asOfDate}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[20rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hairline)] text-[var(--text-muted)]">
                      <th className="py-2 pr-3">
                        {L === "hi" ? "ग्रह" : "Planet"}
                      </th>
                      <th className="py-2 pr-3">
                        {L === "hi" ? "राशि" : "Sign"}
                      </th>
                      <th className="py-2 pr-3">°</th>
                      {transits.planets.some((p) => p.house != null) ? (
                        <th className="py-2 pr-3">
                          {L === "hi" ? "भाव" : "House"}
                        </th>
                      ) : null}
                      <th className="py-2">R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transits.planets.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[var(--hairline)] text-[var(--text)]"
                      >
                        <td className="py-2 pr-3">{labelPlanet(p.id)}</td>
                        <td className="py-2 pr-3">{labelSign(p.sign)}</td>
                        <td className="py-2 pr-3">
                          {p.degreeInSign.toFixed(1)}°
                        </td>
                        {transits.planets.some((tp) => tp.house != null) ? (
                          <td className="py-2 pr-3">{p.house ?? "—"}</td>
                        ) : null}
                        <td className="py-2">{p.retrograde ? "R" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transits.hits.length ? (
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  {transits.hits.map((h) => (
                    <li key={`${h.transitPlanet}-${h.natalPlanet}`}>
                      {L === "hi" ? "गोचर" : "Transit"}:{" "}
                      {labelPlanet(h.transitPlanet)} ≈{" "}
                      {labelPlanet(h.natalPlanet)} ({h.orb}°)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  {L === "hi"
                    ? "अभी कोई निकट गोचर हिट नहीं।"
                    : "No close transit hits right now."}
                </p>
              )}

              {transits.emphasis.length > 0 ? (
                <ul className="space-y-1 text-sm text-[var(--text-soft)]">
                  {transits.emphasis.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}

              <Link
                href={
                  source?.kind === "member"
                    ? `/astrology/members/${source.id}`
                    : "/astrology"
                }
                className="inline-block text-sm text-[var(--brass-soft)] underline-offset-2 hover:underline"
              >
                {L === "hi" ? "पूर्ण चार्ट खोलें" : "Open full chart"}
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
