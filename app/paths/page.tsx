import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import PageHeroImage from "@/components/PageHeroImage";
import PathsListClient from "@/components/PathsListClient";
import { listJourneysByKind } from "@/lib/journeys/content";

export const metadata: Metadata = {
  title: "Paths · MindKshetra",
  description:
    "Themed multi-day journeys of verse, sit, and one honest line a day.",
};

export default function PathsPage() {
  const paths = listJourneysByKind("scripture");

  return (
    <div className="animate-fade">
      <PageHeroImage src="/images/paths/paths.jpg" />
      <LocalizedPageHeader
        eyebrowKey="pathListEyebrow"
        titleKey="pathListTitle"
        introKey="pathListIntro"
      />
      <PathsListClient paths={paths} />
    </div>
  );
}
