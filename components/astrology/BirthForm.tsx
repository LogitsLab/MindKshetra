"use client";

import { useEffect, useRef, useState } from "react";
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

/*
 * Honest privacy copy for the incognito cast, verified against the code: the
 * birth details live in this tab's sessionStorage, and the cast chart in a
 * server-side incognito session that expires after 6 hours
 * (INCOGNITO_TTL_SEC in lib/astrology/incognito.ts). Nothing touches an
 * account unless the user chooses to save. Kept inline rather than in the
 * i18n dictionary only because this change is scoped to this component and
 * the landing page; fold into lib/i18n/namespaces/astrology.ts when that
 * file is next open.
 */
const PRIVACY_NOTE = {
  en: "Your birth details stay in this browser tab; the cast chart lives in a temporary session that expires after 6 hours. Nothing is saved to an account unless you choose to save it.",
  hi: "आपके जन्म विवरण इसी ब्राउज़र टैब में रहते हैं; बनी कुंडली एक अस्थायी सत्र में रहती है जो 6 घंटे बाद समाप्त हो जाता है। जब तक आप स्वयं सहेजना न चुनें, खाते में कुछ नहीं सहेजा जाता।",
} as const;

const fieldClass =
  "w-full border border-[var(--line)] bg-[var(--input-bg)] px-3 py-3 text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)]/45 focus:border-[var(--brass)]/70";

const selectClass =
  "w-full appearance-none border border-[var(--line)] bg-[var(--input-bg)] px-3 py-3 text-[var(--text)] outline-none transition focus:border-[var(--brass)]/70";

export default function BirthForm({
  mode,
  initial,
  submitLabel,
  compact,
  onSubmit,
}: Props) {
  const { t, lang } = useLanguage();
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeRequestId = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function fetchGeocode(q: string): Promise<GeocodeResult[]> {
    const res = await fetch("/api/astrology/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Geocode failed");
    return data.results || [];
  }

  async function searchPlace(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const reqId = ++placeRequestId.current;
    setSearching(true);
    setError(null);
    try {
      const results = await fetchGeocode(q);
      if (reqId !== placeRequestId.current) return;
      setSuggestions(results);
    } catch (err) {
      if (reqId !== placeRequestId.current) return;
      setError(err instanceof Error ? err.message : "Geocode failed");
    } finally {
      if (reqId === placeRequestId.current) setSearching(false);
    }
  }

  function onPlaceChange(value: string) {
    setPlaceQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlace(value), 380);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dob) {
      setError(t("astroDobRequired"));
      return;
    }
    setBusy(true);
    try {
      // If the user typed a place but never picked a suggestion, resolve the
      // top geocode hit instead of erroring. setSelected keeps the resolved
      // place + timezone visible in the brass confirm panel so a wrong guess
      // can be corrected after the fact.
      let place = selected;
      if (!place) {
        const q = placeQuery.trim();
        if (q.length < 2) {
          setError(t("astroPlaceRequired"));
          return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        placeRequestId.current++; // drop any in-flight suggestion search
        setSearching(false);
        const results = await fetchGeocode(q);
        if (results.length === 0) {
          setError(t("astroPlaceRequired"));
          return;
        }
        place = results[0];
        setSelected(place);
        setPlaceQuery(place.label);
        setSuggestions([]);
      }
      await onSubmit({
        name: name.trim() || (mode === "incognito" ? "Guest" : "Member"),
        relationship,
        dob,
        tob: tobUnknown ? "" : tob,
        tobUnknown,
        gender,
        placeLabel: place.label,
        lat: place.lat,
        lng: place.lng,
        ianaTz: place.ianaTz,
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
      className={`space-y-6 ${compact ? "max-w-none" : "mx-auto max-w-lg"}`}
    >
      {mode === "member" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t("astroName")}
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t("astroRelationship")}
            </span>
            <select
              value={relationship}
              onChange={(e) =>
                setRelationship(e.target.value as Relationship)
              }
              className={selectClass}
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
        <label className="block space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
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

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
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
          <label className="block space-y-2">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
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
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={tobUnknown}
              onChange={(e) => setTobUnknown(e.target.checked)}
              className="accent-[var(--brass)]"
            />
            {t("astroTobUnknown")}
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {t("astroGender")}
          </span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | "")}
            className={selectClass}
          >
            <option value="">{t("astroGenderSkip")}</option>
            <option value="female">{t("astroGenderFemale")}</option>
            <option value="male">{t("astroGenderMale")}</option>
            <option value="other">{t("astroGenderOther")}</option>
          </select>
        </label>

        <div className="relative space-y-2">
          <label className="block space-y-2">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t("astroPlace")}
              {searching ? (
                <span className="ml-2 normal-case tracking-normal text-[var(--brass-soft)]">
                  …
                </span>
              ) : null}
            </span>
            <input
              required
              value={placeQuery}
              onChange={(e) => onPlaceChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  searchPlace(placeQuery);
                }
              }}
              placeholder={t("astroPlacePh")}
              autoComplete="off"
              className={fieldClass}
            />
          </label>
          {suggestions.length > 0 && !selected ? (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto border border-[var(--line)] bg-[var(--panel-strong)] shadow-lg backdrop-blur-xl">
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
        </div>
      </div>

      {selected ? (
        <div className="animate-fade border border-[var(--brass)]/25 bg-[var(--brass)]/5 px-3 py-3">
          <p className="text-sm text-[var(--brass-soft)]">
            <span className="text-[var(--text-muted)]">
              {t("astroPlaceConfirm")}:{" "}
            </span>
            {selected.label}
            <span className="text-[var(--text-muted)]"> · {selected.ianaTz}</span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{t("astroPlaceHint")}</p>
      )}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-2 space-y-3">
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[var(--brass)] px-4 py-3.5 text-sm font-medium tracking-wide text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
        >
          {busy ? t("astroWorking") : submitLabel}
        </button>
        {mode === "incognito" ? (
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            {PRIVACY_NOTE[lang] ?? PRIVACY_NOTE.en}
          </p>
        ) : null}
      </div>
    </form>
  );
}
