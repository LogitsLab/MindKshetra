import type { Metadata } from "next";
import SadhanaClient from "@/components/SadhanaClient";

export const metadata: Metadata = {
  title: "Sādhana · MindKshetra",
  description:
    "A short daily practice: meet your mind, sit with one Gita verse, and reflect.",
};

export default function SadhanaPage() {
  return (
    <div className="animate-fade">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          Daily practice
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Sādhana
        </h1>
      </header>
      <SadhanaClient />
    </div>
  );
}
