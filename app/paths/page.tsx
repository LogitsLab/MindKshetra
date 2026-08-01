import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
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
      <LocalizedPageHeader
        eyebrowKey="pathListEyebrow"
        titleKey="pathListTitle"
        introKey="pathListIntro"
      />
      <PathsListClient paths={paths} />
    </div>
  );
}
