"use client";

import { longitudeToNakshatra } from "@/lib/astrology/signs";
import type { ChartPayload } from "@/lib/astrology/types";

type PlanetLike =
  | ChartPayload["planets"][number]
  | ChartPayload["ascendant"];

type Props = {
  open: boolean;
  onClose: () => void;
  planet: PlanetLike | null;
  dignityLabel?: string;
  labelPlanet: (id: string) => string;
  labelSign: (s: string) => string;
  emptyHint?: string;
};

export default function PlanetDetailSheet({
  open,
  onClose,
  planet,
  dignityLabel,
  labelPlanet,
  labelSign,
}: Props) {
  if (!open || !planet) return null;

  const nakLord = longitudeToNakshatra(planet.longitude).lord;
  const name = labelPlanet(planet.id);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col border-t border-[var(--line)] bg-[var(--panel)] text-[var(--text)] md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-md md:border-l md:border-t-0"
      >
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-4">
          <h2 className="font-display text-xl tracking-tight text-[var(--brass-soft)]">
            {name}
            {planet.retrograde ? (
              <span className="ml-2 text-sm text-[var(--text-muted)]">R</span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-4 text-sm">
          <Row label="Longitude" value={`${planet.longitude.toFixed(2)}°`} />
          <Row
            label="Sign"
            value={`${labelSign(planet.sign)} · ${planet.degreeInSign.toFixed(1)}°`}
          />
          <Row
            label="Nakshatra"
            value={`${planet.nakshatra} · pada ${planet.pada}`}
          />
          <Row label="Nakshatra lord" value={labelPlanet(nakLord)} />
          <Row label="House" value={planet.house != null ? String(planet.house) : "—"} />
          <Row label="Dignity" value={dignityLabel ?? "—"} />
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[var(--brass)]/35 pl-3">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[var(--text)]">{value}</p>
    </div>
  );
}
