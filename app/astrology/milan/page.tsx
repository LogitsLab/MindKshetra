import type { Metadata } from "next";
import AstrologyToolIntro from "@/components/AstrologyToolIntro";
import PageHeroImage from "@/components/PageHeroImage";
import MilanClient from "@/components/astrology/MilanClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kundli Milan: Ashtakoota guna matching",
  description:
    "Traditional Ashtakoota (36 guna) compatibility between two saved birth charts, computed from the Swiss Ephemeris and read gently.",
  path: "/astrology/milan",
});

export default function MilanPage() {
  return (
    <div className="animate-fade">
      {/* Ashtakoota is moon-nakshatra matching, and this is the one image in
          the set with a crescent moon and named constellations. */}
      <PageHeroImage src="/images/paths/astrology.jpg" />
      <AstrologyToolIntro
        eyebrow="Kundli Milan"
        title="Ashtakoota guna matching"
        body="Traditional 36-guna Ashtakoota between two birth charts — moon and nakshatra based, computed with the Swiss Ephemeris. Read as cultural companionship for conversation, never as a verdict on love or worth."
        bullets={[
          "Needs two charts (saved members or session charts).",
          "Scores and gunas explained in plain language.",
          "Gita-aware tone: dignity for both people, no fear copy.",
        ]}
      />
      <MilanClient />
    </div>
  );
}
