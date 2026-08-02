import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import PageHeroImage from "@/components/PageHeroImage";
import SanghaClient from "@/components/SanghaClient";
import { getSlokaByRef } from "@/lib/slokas";

export const metadata: Metadata = {
  title: "Community · MindKshetra",
  description:
    "Practice together — weekly live, channels, seva, and a care path. Not a social feed.",
};

export default async function CommunityPage() {
  const microSeva = await getSlokaByRef(3, 21);
  const microSevaHref = microSeva ? `/sloka/${microSeva.id}` : "/explore/3";

  return (
    <div className="animate-fade">
      <PageHeroImage src="/images/paths/community.jpg" />
      <LocalizedPageHeader
        eyebrowKey="sanghaEyebrow"
        titleKey="sanghaTitle"
        introKey="sanghaIntro"
      />
      <SanghaClient microSevaHref={microSevaHref} />
    </div>
  );
}
