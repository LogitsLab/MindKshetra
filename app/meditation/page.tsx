import type { Metadata } from "next";
import MeditationHubClient from "@/components/MeditationHubClient";
import {
  enrichTranscripts,
  loadDailySits,
  loadFoundationProgram,
} from "@/lib/meditation";

export const metadata: Metadata = {
  title: "Meditation course · MindKshetra",
  description:
    "A free progressive seven-day sit — not japa, not a marketplace. Unlock day by day.",
};

export default function MeditationPage() {
  const program = loadFoundationProgram();
  const dailies = loadDailySits();
  if (!program) {
    return (
      <div className="animate-fade max-w-2xl">
        <p className="text-[var(--text-muted)]">Course content is unavailable.</p>
      </div>
    );
  }

  const catalog = {
    program: {
      ...program,
      days: program.days.map(enrichTranscripts),
    },
    dailies: {
      id: dailies?.id ?? "daily-sits",
      title_en: dailies?.title_en ?? "One-off sits",
      title_hi: dailies?.title_hi ?? "एक-बार बैठकें",
      intro_en: dailies?.intro_en ?? "",
      intro_hi: dailies?.intro_hi ?? "",
      sessions: (dailies?.sessions ?? []).map(enrichTranscripts),
    },
  };

  return (
    <div className="animate-fade">
      <MeditationHubClient initialCatalog={catalog} />
    </div>
  );
}
