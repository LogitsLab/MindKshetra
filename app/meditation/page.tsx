import type { Metadata } from "next";
import MeditationHubClient from "@/components/MeditationHubClient";
import {
  enrichTranscripts,
  loadDailySits,
  loadSittingProgram,
} from "@/lib/meditation";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free meditation course",
  description:
    "A free progressive sitting course (foundation, habit and deepening) that unlocks day by day, plus short daily sits. Not japa, not a marketplace.",
  path: "/meditation",
});

export default function MeditationPage() {
  const program = loadSittingProgram();
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
