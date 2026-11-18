import type { Metadata } from "next";
import AstrologyToolIntro from "@/components/AstrologyToolIntro";
import { pageMetadata } from "@/lib/seo";
import HoroscopePageClient from "./HoroscopePageClient";

export const metadata: Metadata = pageMetadata({
  title: "Vedic horoscope from your birth chart",
  description:
    "Horoscope insights narrated from your own chart (dashas, transits and houses), never invented placements, with a Gita verse for each theme.",
  path: "/astrology/horoscope",
});

export default function Page() {
  return (
    <div className="animate-fade">
      <AstrologyToolIntro
        eyebrow="Vedic horoscope"
        title="Read from your own chart"
        body="MindKshetra narrates life themes from your saved birth chart — dashas, houses and current gochar — not from a generic sun-sign column. Each area can open with a Gita verse for reflection, never as fate or medical advice."
        bullets={[
          "Requires a birth chart (saved member or one-session incognito).",
          "Swiss Ephemeris math; language you can sit with, not scare-copy.",
          "Companionship only — not causation, finance, or health prescription.",
        ]}
      />
      <HoroscopePageClient />
    </div>
  );
}
