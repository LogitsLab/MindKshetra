import type { Metadata } from "next";
import CareClient from "@/components/CareClient";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import PageHeroImage from "@/components/PageHeroImage";

export const metadata: Metadata = {
  title: "Care · MindKshetra",
  description:
    "Starting-point helplines in India. MindKshetra is a Gita companion, not clinical care.",
};

export default function CarePage() {
  return (
    <div className="animate-fade">
      {/* The lotus at first light — not community.jpg, which is a group around
          a fire and reads as "join us" above three suicide-prevention numbers.
          This page is for someone alone at 3am; the register has to be "there
          is a morning", not "everyone else is together". */}
      <PageHeroImage src="/images/paths/mood.jpg" />
      <LocalizedPageHeader
        eyebrowKey="careEyebrow"
        titleKey="careTitle"
        introKey="careIntro"
      />
      <CareClient />
    </div>
  );
}
