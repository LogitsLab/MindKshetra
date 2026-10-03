import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
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
      <LocalizedPageHeader eyebrowKey="milanEyebrow" titleKey="milanTitle" />
      <MilanClient />
    </div>
  );
}
