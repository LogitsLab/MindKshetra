"use client";

import { useState } from "react";
import type { GeocodeResult, Relationship, Gender } from "@/lib/astrology/types";
import { useLanguage } from "@/components/LanguageProvider";

export type BirthFormValues = {
  name: string;
  relationship: Relationship;
  dob: string;
  tob: string;
  tobUnknown: boolean;
  gender: Gender | "";
  placeLabel: string;
  lat: number;
  lng: number;
  ianaTz: string;
};

type Props = {
  mode: "member" | "incognito";
  initial?: Partial<BirthFormValues>;
  submitLabel: string;
  /** Tighter two-column layout for the landing cast form */
  compact?: boolean;
  onSubmit: (values: BirthFormValues) => Promise<void>;
};

const RELATIONS: Relationship[] = [
  "self",
  "spouse",
  "child",
  "friend",
  "other",
];

const fieldClass =
  "w-full border border-[var(--line)] bg-transparent px-3 py-2.5 text-[var(--text)] outline-none transition focus:border-[var(--brass)]/55";

export default function BirthForm({
  mode,
  initial,
  submitLabel,
  compact,
  onSubmit,
}: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState(initial?.name || "");
  const [relationship, setRelationship] = useState<Relationship>(
    initial?.relationship || "self"
  );
  const [dob, setDob] = useState(initial?.dob || "");
  const [tob, setTob] = useState(initial?.tob || "12:00");
  const [tobUnknown, setTobUnknown] = useState(initial?.tobUnknown || false);
  const [gender, setGender] = useState<Gender | "">(initial?.gender || "");
  const [placeQuery, setPlaceQuery] = useState(initial?.placeLabel || "");
  const [selected, setSelected] = useState<GeocodeResult | null>(
    initial?.lat != null
      ? {
          label: initial.placeLabel || "",
          lat: initial.lat,
          lng: initial.lng!,
          ianaTz: initial.ianaTz || "UTC",
        }
      : null
  );
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchPlace() {
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/astrology/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: placeQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Geocode failed");
      setSuggestions(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geocode failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError(t("astroPlaceRequired"));
      return;
    }
    if (!dob) {
      setError(t("astroDobRequired"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim() || (mode === "incognito" ? "Guest" : "Member"),
        relationship,
        dob,
        tob: tobUnknown ? "" : tob,
        tobUnknown,
        gender,
        placeLabel: selected.label,
        lat: selected.lat,
        lng: selected.lng,
        ianaTz: selected.ianaTz,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-5 ${compact ? "max-w-none" : "mx-auto max-w-lg"}`}
    >
      {mode === "member" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {t("astroName")}
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {t("astroRelationship")}
            </span>
            <select
              value={relationship}
              onChange={(e) =>
                setRelationship(e.target.value as Relationship)
              }
              className={fieldClass}
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {t(`astroRel_${r}` as "astroRel_self")}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t("astroNameOptional")}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("astroNameOptionalPh")}
            className={fieldClass}
          />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t("astroDob")}
          </span>
          <input
            required
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            min="1800-01-01"
            max="2100-12-31"
            className={fieldClass}
          />
        </label>
        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {t("astroTob")}
            </span>
            <input
              type="time"
              step="1"
              disabled={tobUnknown}
              value={tob}
              onChange={(e) => setTob(e.target.value)}
              className={`${fieldClass} disabled:opacity-40`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={tobUnknown}
              onChange={(e) => setTobUnknown(e.target.checked)}
            />
            {t("astroTobUnknown")}
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-1">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t("astroGender")}
          </span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | "")}
            className={fieldClass}
          >
            <option value="">{t("astroGenderSkip")}</option>
            <option value="female">{t("astroGenderFemale")}</option>
            <option value="male">{t("astroGenderMale")}</option>
            <option value="other">{t("astroGenderOther")}</option>
          </select>
        </label>

        <div className="space-y-2 sm:col-span-1">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t("astroPlace")}
          </span>
          <div className="flex gap-2">
            <input
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                setSelected(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchPlace();
                }
              }}
              placeholder={t("astroPlacePh")}
              className={`min-w-0 flex-1 ${fieldClass}`}
            />
            <button
              type="button"
              onClick={searchPlace}
              disabled={searching || placeQuery.trim().length < 2}
              className="shrink-0 border border-[var(--brass)]/40 px-3 py-2.5 text-sm text-[var(--brass-soft)] transition hover:bg-[var(--brass)]/10 disabled:opacity-40"
            >
              {searching ? "…" : t("astroSearch")}
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <p className="text-sm text-[var(--brass-soft)]">
          {selected.label}
          <span className="text-[var(--text-muted)]"> · {selected.ianaTz}</span>
        </p>
      ) : null}
      {suggestions.length > 0 ? (
        <ul className="max-h-44 overflow-auto border border-[var(--line)]">
          {suggestions.map((s) => (
            <li key={`${s.lat},${s.lng},${s.label}`}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm text-[var(--text)] transition hover:bg-[var(--brass)]/10"
                onClick={() => {
                  setSelected(s);
                  setPlaceQuery(s.label);
                  setSuggestions([]);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[var(--brass)] px-4 py-3.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
      >
        {busy ? t("astroWorking") : submitLabel}
      </button>
    </form>
  );
}
