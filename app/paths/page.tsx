import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import PageHeroImage from "@/components/PageHeroImage";
import PathsListClient from "@/components/PathsListClient";
import { listPracticePaths } from "@/lib/paths";

export const metadata: Metadata = {
  title: "Paths · MindKshetra",
  description:
    "Themed multi-day journeys of verse, sit, and one honest line a day.",
};

export default function PathsPage() {
  const paths = listPracticePaths();

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
