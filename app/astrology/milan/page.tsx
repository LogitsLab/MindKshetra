import type { Metadata } from "next";
import MilanClient from "@/components/astrology/MilanClient";

export const metadata: Metadata = {
  title: "Kundli Milan · MindKshetra",
  description:
    "Traditional Ashtakoota compatibility between two saved charts — computed from the Swiss Ephemeris, read gently.",
};

export default function MilanPage() {
  return (
    <div className="animate-fade">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          Kundli Milan
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Milan
        </h1>
      </header>
      <MilanClient />
    </div>
  );
}
