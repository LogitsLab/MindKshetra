import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import PanchangView from "@/components/PanchangView";

export const metadata: Metadata = {
  title: "Panchang · MindKshetra",
  description:
    "Today's tithi, nakshatra, yoga, karana and vaar — computed from the Swiss Ephemeris at local sunrise.",
};

export default function PanchangPage() {
  return (
    <div className="animate-fade">
      <LocalizedPageHeader eyebrowKey="panchangEyebrow" titleKey="panchangTitle" />
      <PanchangView />
    </div>
  );
}
