import type { Metadata } from "next";
import CareClient from "@/components/CareClient";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";

export const metadata: Metadata = {
  title: "Care · MindKshetra",
  description:
    "Starting-point helplines in India. MindKshetra is a Gita companion, not clinical care.",
};

export default function CarePage() {
  return (
    <div className="animate-fade">
      <LocalizedPageHeader
        eyebrowKey="careEyebrow"
        titleKey="careTitle"
        introKey="careIntro"
      />
      <CareClient />
    </div>
  );
}
