import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import PageHeroImage from "@/components/PageHeroImage";
import SupportClient from "@/components/SupportClient";

export const metadata: Metadata = {
  title: "Support · MindKshetra",
  description:
    "MindKshetra is free forever. Dāna keeps it that way for everyone and funds free access for students.",
};

export default function SupportPage() {
  return (
    <div className="animate-fade">
      {/* Dāna is a gathering, not a transaction — the lantern under the tree.
          No introKey: SupportClient already opens with supportIntro. */}
      <PageHeroImage src="/images/paths/community.jpg" />
      <LocalizedPageHeader
        eyebrowKey="supportEyebrow"
        titleKey="supportTitle"
      />
      <SupportClient />
    </div>
  );
}
