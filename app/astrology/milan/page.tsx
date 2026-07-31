import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import MilanClient from "@/components/astrology/MilanClient";

export const metadata: Metadata = {
  title: "Kundli Milan · MindKshetra",
  description:
    "Traditional Ashtakoota compatibility between two saved charts — computed from the Swiss Ephemeris, read gently.",
};

export default function MilanPage() {
  return (
    <div className="animate-fade">
      <LocalizedPageHeader eyebrowKey="milanEyebrow" titleKey="milanTitle" />
      <MilanClient />
    </div>
  );
}
