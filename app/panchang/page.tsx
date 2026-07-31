import type { Metadata } from "next";
import PanchangView from "@/components/PanchangView";

export const metadata: Metadata = {
  title: "Panchang · MindKshetra",
  description:
    "Today's tithi, nakshatra, yoga, karana and vaar — computed from the Swiss Ephemeris at local sunrise.",
};

export default function PanchangPage() {
  return (
    <div className="animate-fade">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          Daily almanac
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Panchang
        </h1>
      </header>
      <PanchangView />
    </div>
  );
}
