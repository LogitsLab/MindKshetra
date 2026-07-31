"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import EmptyState from "@/components/EmptyState";
import type { DictKey } from "@/lib/i18n/dictionary";

type Member = { id: string; name: string; relationship: string };

type Koota = { name: string; score: number; max: number; note: string };

type MilanResult = {
  kootas: Koota[];
  total: number;
  max: 36;
  band: "excellent" | "good" | "acceptable" | "needs-discussion";
  caveat: string;
  nadiDosha: boolean;
};

const BAND_KEY: Record<MilanResult["band"], DictKey> = {
  excellent: "milanBandExcellent",
  good: "milanBandGood",
  acceptable: "milanBandAcceptable",
  "needs-discussion": "milanBandNeedsDiscussion",
};

const NOTE_KEY: Record<string, DictKey> = {
  Varna: "milanNoteVarna",
  Vashya: "milanNoteVashya",
  Tara: "milanNoteTara",
  Yoni: "milanNoteYoni",
  "Graha Maitri": "milanNoteGrahaMaitri",
  Gana: "milanNoteGana",
  Bhakoot: "milanNoteBhakoot",
  Nadi: "milanNoteNadi",
};

export default function MilanClient() {
  const { t } = useLanguage();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "signed-out" | "error"
  >("loading");
  const [memberA, setMemberA] = useState("");
  const [memberB, setMemberB] = useState("");
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<MilanResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/astrology/members")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState("signed-out");
          return;
        }
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { members: Member[] };
        setMembers(data.members ?? []);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function compute() {
    setNotice(null);
    setResult(null);
    if (!memberA || !memberB) return;
    if (memberA === memberB) {
      setNotice(t("milanSamePerson"));
      return;
    }
    setComputing(true);
    try {
      const res = await fetch("/api/astrology/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberA, memberB }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.result) {
        setResult(data.result as MilanResult);
      } else if (res.status === 422) {
        // Missing birth time — say so in the user's language; never render
        // a zero that reads as "incompatible".
        setNotice(t("milanMissingBirthTime"));
      } else {
        setNotice(t("milanUnavailable"));
      }
    } catch {
      setNotice(t("milanUnavailable"));
    } finally {
      setComputing(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="surface animate-pulse px-6 py-10">
        <div className="h-4 w-48 bg-[var(--hairline)]" />
        <div className="mt-4 h-4 w-64 bg-[var(--hairline)]" />
      </div>
    );
  }

  if (state === "signed-out") {
    return (
      <div>
        <EmptyState title={t("milanSignIn")} />
        <div className="mt-4 text-center">
          <Link
            href="/account"
            className="inline-block border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
          >
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <EmptyState
        title={t("milanUnavailable")}
        body={t("milanUnavailableBody")}
      />
    );
  }

  if (!members || members.length < 2) {
    return (
      <div>
        <EmptyState title={t("milanNeedTwo")} body={t("milanNeedTwoBody")} />
        <div className="mt-4 text-center">
          <Link
            href="/astrology/members/new"
            className="inline-block border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
          >
            {t("astroManage")}
          </Link>
        </div>
      </div>
    );
  }

  const selectClass =
    "min-h-11 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--brass)]/60 focus:outline-none";

  return (
    <div className="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("milanPickA")}
          </span>
          <select
            value={memberA}
            onChange={(e) => setMemberA(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("milanPickB")}
          </span>
          <select
            value={memberB}
            onChange={(e) => setMemberB(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void compute()}
        disabled={computing || !memberA || !memberB}
        className="mt-6 min-h-11 bg-[var(--brass)] px-6 py-3 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
      >
        {computing ? t("milanComputing") : t("milanCompute")}
      </button>

      {notice ? (
        <p className="mt-6 border-l-2 border-[var(--brass)]/60 pl-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
          {notice}
        </p>
      ) : null}

      {result ? (
        <MilanResultView
          result={result}
          nameA={members.find((m) => m.id === memberA)?.name ?? ""}
          nameB={members.find((m) => m.id === memberB)?.name ?? ""}
        />
      ) : null}
    </div>
  );
}

function MilanResultView({
  result,
  nameA,
  nameB,
}: {
  result: MilanResult;
  nameA: string;
  nameB: string;
}) {
  const { t } = useLanguage();

  return (
    <section className="mt-10">
      <p className="font-display text-2xl leading-snug text-[var(--text)] sm:text-3xl">
        {t(BAND_KEY[result.band])}
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {t("milanScoreOf").replace("{score}", String(result.total))}
      </p>

      <dl className="mt-8">
        {result.kootas.map((koota) => (
          <div
            key={koota.name}
            className="border-t border-[var(--hairline)] py-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-display text-lg text-[var(--text)]">
                {koota.name}
              </dt>
              <dd className="text-sm text-[var(--text-muted)]">
                {koota.score} / {koota.max}
              </dd>
            </div>
            <p className="mt-1 text-sm font-light leading-relaxed text-[var(--text-muted)]">
              {koota.name === "Nadi" && koota.score === 0
                ? t("milanNoteNadiSame")
                : NOTE_KEY[koota.name]
                  ? t(NOTE_KEY[koota.name])
                  : koota.note}
            </p>
          </div>
        ))}
      </dl>

      {result.nadiDosha ? (
        <div className="mt-8 border-l-2 border-[var(--brass)]/60 pl-4">
          <p className="font-display text-lg text-[var(--text)]">
            {t("milanNadiTitle")}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--text-muted)]">
            {t("milanNadiBody")}
          </p>
        </div>
      ) : null}

      <p className="mt-8 border-t border-[var(--hairline)] pt-4 text-[15px] leading-relaxed text-[var(--text-soft)]">
        {t("milanCaveat")}
      </p>

      {result.band === "needs-discussion" ? (
        <Link
          href={`/madhav?prompt=${encodeURIComponent(
            t("milanMadhavSeed")
              .replace("{nameA}", nameA)
              .replace("{nameB}", nameB)
              .replace("{score}", String(result.total))
          )}`}
          className="mt-6 inline-block border border-[var(--line)] px-5 py-3 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
        >
          {t("milanAskMadhav")} →
        </Link>
      ) : null}
    </section>
  );
}
