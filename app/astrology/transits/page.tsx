import type { Metadata } from "next";
import AstrologyToolIntro from "@/components/AstrologyToolIntro";
import { pageMetadata } from "@/lib/seo";
import TransitsPageClient from "./TransitsPageClient";

export const metadata: Metadata = pageMetadata({
  title: "Planetary transits (gochar) today",
  description:
    "Where the planets are today and how their transits (gochar) touch your Vedic birth chart, computed with the Swiss Ephemeris.",
  path: "/astrology/transits",
});

export default function Page() {
  return (
    <div className="animate-fade">
      <AstrologyToolIntro
        eyebrow="Gochar"
        title="Planetary transits today"
        body="See where the planets are now (gochar) and how those skies touch the houses of a Vedic birth chart. Timings use the Swiss Ephemeris; the reading is for reflection beside the Gita, not prediction-as-command."
        bullets={[
          "Chart-aware when you have a saved or session chart.",
          "Delhi-reference sky available as a gentle default context.",
          "No scare transit alerts — companionship language only.",
        ]}
      />
      <TransitsPageClient />
    </div>
  );
}
