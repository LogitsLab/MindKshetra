import type { Metadata } from "next";
import AstrologyToolIntro from "@/components/AstrologyToolIntro";
import { pageMetadata } from "@/lib/seo";
import MuhuratPageClient from "./MuhuratPageClient";

export const metadata: Metadata = pageMetadata({
  title: "Today's muhurat and choghadiya timings",
  description:
    "Today's auspicious muhurats and choghadiya periods for your location, with good, neutral and avoid windows computed at local sunrise.",
  path: "/astrology/muhurat",
});

export default function Page() {
  return (
    <div className="animate-fade">
      <AstrologyToolIntro
        eyebrow="Muhurat"
        title="Today's muhurat and choghadiya"
        body="Local sunrise opens the day: choghadiya and traditional muhurat windows for your place — good, neutral, and quieter hours. Use them as orientation, not as a rule that overrides conscience or care."
        bullets={[
          "Computed for your location when location is available.",
          "Swiss Ephemeris sunrise; periods labelled gently.",
          "Pair with today's panchang or a short sādhana if you wish.",
        ]}
      />
      <MuhuratPageClient />
    </div>
  );
}
