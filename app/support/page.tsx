import type { Metadata } from "next";
import SupportClient from "@/components/SupportClient";

export const metadata: Metadata = {
  title: "Support · MindKshetra",
  description:
    "MindKshetra is free forever. Dāna keeps it that way for everyone and funds free access for students.",
};

export default function SupportPage() {
  return (
    <div className="animate-fade">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          Dāna
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Support MindKshetra
        </h1>
      </header>
      <SupportClient />
    </div>
  );
}
