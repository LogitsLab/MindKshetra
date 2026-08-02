import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import PageHeroImage from "@/components/PageHeroImage";
import MilanClient from "@/components/astrology/MilanClient";

export const metadata: Metadata = {
  title: "Kundli Milan · MindKshetra",
  description:
    "Traditional Ashtakoota compatibility between two saved charts — computed from the Swiss Ephemeris, read gently.",
};

export default function MilanPage() {
  return (
    <div className="animate-fade">
      {/* Ashtakoota is moon-nakshatra matching, and this is the one image in
          the set with a crescent moon and named constellations. */}
      <PageHeroImage src="/images/paths/astrology.jpg" />
      <LocalizedPageHeader eyebrowKey="milanEyebrow" titleKey="milanTitle" />
      <MilanClient />
    </div>
  );
}
